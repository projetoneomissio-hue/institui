import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const gmailEmail = Deno.env.get("GMAIL_EMAIL");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Supabase credentials not configured");
    }

    if (!gmailEmail || !gmailPassword) {
      console.error("Missing Gmail credentials");
      throw new Error("Gmail credentials not configured");
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    console.log("Auth result:", { userId: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error("Auth failed:", authError?.message || "No user");
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if user has coordenacao or direcao role (only these can trigger notifications)
    const { data: roleData, error: roleError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || !['direcao', 'coordenacao'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting automatic notifications check...");

    // 1. Verificar pagamentos próximos ao vencimento (5 dias antes)
    const cincoDiasDepois = new Date();
    cincoDiasDepois.setDate(cincoDiasDepois.getDate() + 5);
    const dataLimite = cincoDiasDepois.toISOString().split("T")[0];
    const hoje = new Date().toISOString().split("T")[0];

    const { data: pagamentosProximos, error: errorProximos } = await supabase
      .from("pagamentos")
      .select(`
        id,
        data_vencimento,
        valor,
        matricula:matriculas!inner(
          id,
          aluno:alunos!inner(
            nome_completo,
            responsavel:responsavel_id(
              nome_completo,
              email
            )
          ),
          turma:turmas!inner(
            nome,
            atividade:atividades!inner(nome)
          )
        )
      `)
      .eq("status", "pendente")
      .gte("data_vencimento", hoje)
      .lte("data_vencimento", dataLimite);

    if (errorProximos) {
      console.error("Error fetching upcoming payments:", errorProximos);
    } else {
      console.log(`Found ${pagamentosProximos?.length || 0} upcoming payments`);

      // Enviar notificações para pagamentos próximos
      for (const pag of pagamentosProximos || []) {
        const matricula = pag.matricula as any;
        const aluno = matricula.aluno;
        const responsavel = aluno.responsavel;
        const turma = matricula.turma;
        const atividade = turma.atividade;

        const diasParaVencimento = Math.ceil(
          (new Date(pag.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #e3f2fd; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; }
                .alert { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .details { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0; }
                .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0; color: #1976d2;">Lembrete de Pagamento</h2>
                </div>
                <div class="content">
                  <p>Olá, <strong>${responsavel.nome_completo}</strong>,</p>
                  
                  <p>Este é um lembrete amigável sobre o pagamento da mensalidade do(a) aluno(a) <strong>${aluno.nome_completo}</strong>.</p>
                  
                  <div class="alert">
                    <strong>Vencimento em ${diasParaVencimento} dia(s)</strong>
                  </div>
                  
                  <div class="details">
                    <h3 style="margin-top: 0;">Detalhes do Pagamento</h3>
                    <p><strong>Aluno:</strong> ${aluno.nome_completo}</p>
                    <p><strong>Atividade:</strong> ${atividade.nome}</p>
                    <p><strong>Turma:</strong> ${turma.nome}</p>
                    <p><strong>Data de Vencimento:</strong> ${new Date(pag.data_vencimento).toLocaleDateString("pt-BR")}</p>
                    <p><strong>Valor:</strong> R$ ${Number(pag.valor).toFixed(2)}</p>
                  </div>
                  
                  <p>Para evitar atrasos, solicitamos que realize o pagamento até a data de vencimento.</p>
                  
                  <p>Atenciosamente,<br><strong>Equipe Neo Missio</strong></p>
                </div>
                <div class="footer">
                  <p>Este é um email automático. Por favor, não responda diretamente.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        console.log(`Notification prepared for: ${responsavel.email}`);
        // Em produção, aqui seria feito o envio real do email via Gmail SMTP
      }
    }

    // 2. Verificar matrículas pendentes (aguardando aprovação há mais de 3 dias)
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

    const { data: matriculasPendentes, error: errorMatriculas } = await supabase
      .from("matriculas")
      .select(`
        id,
        created_at,
        aluno:alunos!inner(
          nome_completo,
          responsavel:responsavel_id(
            nome_completo,
            email
          )
        ),
        turma:turmas!inner(
          nome,
          atividade:atividades!inner(nome)
        )
      `)
      .eq("status", "pendente")
      .lt("created_at", tresDiasAtras.toISOString());

    if (errorMatriculas) {
      console.error("Error fetching pending enrollments:", errorMatriculas);
    } else {
      console.log(`Found ${matriculasPendentes?.length || 0} pending enrollments`);

      // Enviar notificações para matrículas pendentes
      for (const mat of matriculasPendentes || []) {
        const matricula = mat as any;
        const aluno = matricula.aluno;
        const responsavel = aluno.responsavel;

        const diasPendente = Math.ceil(
          (new Date().getTime() - new Date(matricula.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log(`Enrollment pending for ${diasPendente} days: ${responsavel.email}`);
        // Em produção, aqui seria feito o envio real do email
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications processed",
        stats: {
          upcomingPayments: pagamentosProximos?.length || 0,
          pendingEnrollments: matriculasPendentes?.length || 0,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error processing notifications:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: "Failed to process notifications",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);
