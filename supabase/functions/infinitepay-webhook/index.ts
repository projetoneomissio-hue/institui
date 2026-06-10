import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "https://api.infinitepay.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-infinitepay-signature",
};

const WEBHOOK_SECRET = Deno.env.get("INFINITEPAY_WEBHOOK_SECRET") ?? "";

/**
 * Valida a assinatura HMAC-SHA256 enviada pela InfinitePay no header
 * x-infinitepay-signature. Previne que payloads forjados marquem
 * pagamentos como pagos sem que o evento tenha vindo da InfinitePay.
 */
async function validateSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
    if (!WEBHOOK_SECRET) {
        console.warn("[INFINITEPAY-WEBHOOK] INFINITEPAY_WEBHOOK_SECRET não configurado — validação de assinatura ignorada");
        return true;
    }
    if (!signatureHeader) {
        console.error("[INFINITEPAY-WEBHOOK] Header x-infinitepay-signature ausente");
        return false;
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const expectedHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    return signatureHeader === expectedHex;
}

/**
 * InfinitePay Webhook Handler
 *
 * Receives payment confirmation from InfinitePay when
 * a checkout is completed (PIX or Credit Card).
 *
 * Expected payload:
 * {
 *   invoice_slug: string,
 *   amount: number,         // in centavos
 *   paid_amount: number,    // in centavos
 *   installments: number,
 *   capture_method: "credit_card" | "pix",
 *   transaction_nsu: string,
 *   order_nsu: string,      // our pagamento ID
 *   receipt_url: string,
 *   items: [...]
 * }
 *
 * Security: validates x-infinitepay-signature HMAC-SHA256 header.
 * Configure INFINITEPAY_WEBHOOK_SECRET in Supabase Secrets.
 */

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
        // Lê o body como texto para validar a assinatura ANTES de parsear JSON
        const rawBody = await req.text();
        const signatureHeader = req.headers.get("x-infinitepay-signature");

        const isValid = await validateSignature(rawBody, signatureHeader);
        if (!isValid) {
            console.error("[INFINITEPAY-WEBHOOK] Assinatura inválida — payload rejeitado");
            return new Response(JSON.stringify({ success: false, message: "Invalid signature" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const body = JSON.parse(rawBody);
        console.log("[INFINITEPAY-WEBHOOK] Received:", JSON.stringify(body));

        const {
            order_nsu,
            amount,
            paid_amount,
            capture_method,
            transaction_nsu,
            receipt_url,
            invoice_slug,
        } = body;

        // 1. Validate that order_nsu exists (this is our pagamentoId)
        if (!order_nsu) {
            console.error("[INFINITEPAY-WEBHOOK] Missing order_nsu in payload");
            return new Response(JSON.stringify({
                success: false,
                message: "Missing order_nsu",
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const pagamentoId = order_nsu;

        // 2. Fetch the payment to verify it exists
        const { data: currentPayment, error: fetchError } = await supabase
            .from("pagamentos")
            .select("id, status")
            .eq("id", pagamentoId)
            .single();

        if (fetchError || !currentPayment) {
            console.error("[INFINITEPAY-WEBHOOK] Payment not found:", pagamentoId, fetchError);
            return new Response(JSON.stringify({
                success: false,
                message: "Pedido não encontrado",
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Idempotency check: skip if already paid
        if (currentPayment.status === "pago") {
            console.log("[INFINITEPAY-WEBHOOK] IDEMPOTENCY HIT: Payment already paid:", pagamentoId);
            return new Response(JSON.stringify({
                success: true,
                message: null,
            }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Determine payment method
        const formaPagamento = capture_method === "pix" ? "PIX Online" : "Cartão Online";

        // 5. Update payment status
        const { error: updateError } = await supabase
            .from("pagamentos")
            .update({
                status: "pago",
                data_pagamento: new Date().toISOString().split("T")[0],
                forma_pagamento: formaPagamento,
                gateway_id: transaction_nsu || invoice_slug,
                gateway_provider: "infinitepay",
                observacoes: `InfinitePay: ${capture_method} | NSU: ${transaction_nsu || "N/A"} | Recibo: ${receipt_url || "N/A"}`,
            })
            .eq("id", pagamentoId);

        if (updateError) {
            console.error("[INFINITEPAY-WEBHOOK] Error updating payment:", updateError);
            throw updateError;
        }

        console.log("[INFINITEPAY-WEBHOOK] Payment marked as paid:", pagamentoId, "via", formaPagamento);

        // 6. Send confirmation email (best effort)
        try {
            // Fetch student/parent details for email
            const { data: pagamentoDetails } = await supabase
                .from("pagamentos")
                .select(`
          valor,
          matricula:matriculas!inner(
            aluno:alunos!inner(nome_completo),
            responsavel_id
          )
        `)
                .eq("id", pagamentoId)
                .single();

            if (pagamentoDetails) {
                const matricula = pagamentoDetails.matricula as any;
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("email, nome_completo")
                    .eq("id", matricula.responsavel_id)
                    .single();

                if (profile?.email) {
                    console.log("[INFINITEPAY-WEBHOOK] Sending confirmation email to:", profile.email);

                    const valorFormatado = Number(pagamentoDetails.valor).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                    });

                    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                        },
                        body: JSON.stringify({
                            to: profile.email,
                            subject: `✅ Pagamento Confirmado - ${matricula.aluno.nome_completo}`,
                            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #16a34a;">✅ Pagamento Confirmado!</h2>
                  <p>Olá, <strong>${profile.nome_completo}</strong>!</p>
                  <p>Confirmamos o recebimento do pagamento:</p>
                  <ul>
                    <li><strong>Aluno:</strong> ${matricula.aluno.nome_completo}</li>
                    <li><strong>Valor:</strong> ${valorFormatado}</li>
                    <li><strong>Forma:</strong> ${formaPagamento}</li>
                  </ul>
                  ${receipt_url ? `<p><a href="${receipt_url}">📄 Ver comprovante</a></p>` : ""}
                  <p style="color: #666; font-size: 12px;">Neo Missio - Sistema de Gestão Escolar</p>
                </div>
              `,
                        }),
                    });
                }
            }
        } catch (emailErr) {
            console.error("[INFINITEPAY-WEBHOOK] Email sending failed (non-critical):", emailErr);
        }

        // 7. Respond to InfinitePay with success (must be fast, < 1 second)
        return new Response(JSON.stringify({
            success: true,
            message: null,
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[INFINITEPAY-WEBHOOK] Error:", errorMessage);
        return new Response(JSON.stringify({
            success: false,
            message: errorMessage,
        }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
