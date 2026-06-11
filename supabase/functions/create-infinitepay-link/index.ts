import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const INFINITEPAY_HANDLE_FALLBACK = Deno.env.get("INFINITEPAY_HANDLE"); // fallback legado (Neo Missio)
const INFINITEPAY_API_URL = "https://api.infinitepay.io/invoices/public/checkout/links";

const ALLOWED_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "https://sistema.neomissio.com.br";

const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateLinkRequest {
    pagamentoId: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    try {
        console.log("[INFINITEPAY] Function started");

        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");

        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (userError || !userData.user) throw new Error("User not authenticated");

        const user = userData.user;
        console.log("[INFINITEPAY] User authenticated:", user.email);

        // 2. Initialize Admin Client
        const supabaseService = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 3. Check Permissions (RBAC)
        const { data: rolesData, error: roleError } = await supabaseService
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

        if (roleError) console.error("[INFINITEPAY] Role check error:", roleError);

        const userRoles = (rolesData || []).map((r: any) => r.role);
        const hasPermission = userRoles.some((role: string) => ["direcao", "coordenacao"].includes(role));
        if (!hasPermission) {
            console.error("[INFINITEPAY] Permission denied. Roles found:", userRoles);
            throw new Error("Permission denied: requires coordenacao or direcao role");
        }

        // 4. Validate Input
        const { pagamentoId } = await req.json() as CreateLinkRequest;
        if (!pagamentoId) throw new Error("pagamentoId is required");

        // 5. Fetch Payment Details (inclui unidade_id para buscar gateway)
        const { data: pagamento, error: pagError } = await supabaseService
            .from("pagamentos")
            .select(`
        id, valor, data_vencimento, status, referencia, unidade_id,
        matricula:matriculas!inner(
          aluno:alunos!inner(
            nome_completo
          ),
          turma:turmas!inner(
            nome,
            atividade:atividades!inner(nome)
          )
        )
      `)
            .eq("id", pagamentoId)
            .single();

        if (pagError || !pagamento) throw new Error("Payment not found");

        // 5b. Busca o gateway configurado pela unidade do pagamento
        const { data: unidadeData } = await supabaseService
            .from("unidades")
            .select("gateway_config")
            .eq("id", (pagamento as any).unidade_id)
            .single();

        const gatewayConfig = (unidadeData as any)?.gateway_config;
        const INFINITEPAY_HANDLE = gatewayConfig?.handle || INFINITEPAY_HANDLE_FALLBACK;

        if (!INFINITEPAY_HANDLE) {
            throw new Error("Gateway não configurado. Acesse Configurações → Pagamentos para conectar seu intermediador financeiro.");
        }

        if (pagamento.status === "pago") {
            throw new Error("Payment already completed");
        }

        const matricula = pagamento.matricula as any;
        const aluno = matricula.aluno;
        const atividade = matricula.turma.atividade;

        // Smart description based on payment type
        const isMatricula = (pagamento as any).referencia?.toUpperCase()?.includes("MATRICULA") ||
                            (pagamento as any).referencia?.toUpperCase()?.includes("TAXA");
        const descricaoItem = isMatricula
            ? `Taxa de Matrícula - ${atividade.nome} - ${aluno.nome_completo}`
            : `Mensalidade - ${atividade.nome} - ${aluno.nome_completo}`;

        // 6. Convert value to centavos (InfinitePay uses centavos)
        const amountInCentavos = Math.round(Number(pagamento.valor) * 100);

        // 7. Build webhook URL
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

        // 8. Build redirect URL
        const origin = req.headers.get("origin") || "https://sistema.neomissio.com.br";
        const redirectUrl = `${origin}/responsavel/pagamento-sucesso?payment_id=${pagamentoId}`;

        console.log("[INFINITEPAY] Creating checkout link for:", pagamentoId, "Amount:", amountInCentavos, "Type:", isMatricula ? "MATRICULA" : "MENSALIDADE");

        // 9. Create InfinitePay Checkout Link
        const checkoutPayload = {
            handle: INFINITEPAY_HANDLE,
            redirect_url: redirectUrl,
            webhook_url: webhookUrl,
            order_nsu: pagamentoId, // Maps to our pagamento ID
            customer: {
                name: aluno.nome_completo,
            },
            items: [
                {
                    quantity: 1,
                    price: amountInCentavos,
                    description: descricaoItem,
                },
            ],
        };

        const checkoutRes = await fetch(INFINITEPAY_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(checkoutPayload),
        });

        if (!checkoutRes.ok) {
            const errorText = await checkoutRes.text();
            console.error("[INFINITEPAY] API Error:", checkoutRes.status, errorText);
            throw new Error(`InfinitePay API error (${checkoutRes.status}): ${errorText}`);
        }

        const checkoutData = await checkoutRes.json();
        const checkoutUrl = checkoutData.url;

        if (!checkoutUrl) {
            throw new Error("InfinitePay did not return a checkout URL");
        }

        console.log("[INFINITEPAY] Checkout link created:", checkoutUrl);

        const finalUrl = checkoutUrl;

        // 10. Save gateway info to pagamentos table
        const { error: updateError } = await supabaseService
            .from("pagamentos")
            .update({
                gateway_url: finalUrl,
                gateway_provider: "infinitepay",
            })
            .eq("id", pagamentoId);

        if (updateError) {
            console.error("[INFINITEPAY] Error saving gateway URL:", updateError);
            // Non-critical: link was created, just failed to save URL
        }

        return new Response(JSON.stringify({
            success: true,
            gateway_url: finalUrl,
            pagamentoId,
            alunoNome: aluno.nome_completo,
            atividadeNome: atividade.nome,
            valor: pagamento.valor,
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[INFINITEPAY] Error:", errorMessage);
        const status = errorMessage.includes("not authenticated") || errorMessage.includes("Permission denied") ? 401 : 400;
        return new Response(JSON.stringify({ error: errorMessage, success: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status,
        });
    }
});
