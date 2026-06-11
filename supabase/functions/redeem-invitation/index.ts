import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token, email } = await req.json();

    if (!token || !email) {
      return new Response(JSON.stringify({ error: "Token e Email são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Validar Convite
    const { data: invite, error: inviteError } = await supabaseClient
      .from("invitations")
      .select("*")
      .eq("token", token)
      .eq("email", normalizedEmail)
      .is("used_at", null)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Convite inválido, expirado ou e-mail incorreto." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Este convite já expirou." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verificar se o Usuário já existe no Auth
    console.log(`Verificando existência do usuário via Auth Admin (Full Scan): ${normalizedEmail}`);
    const { data: { users }, error: authError } = await supabaseClient.auth.admin.listUsers({
      perPage: 1000
    });
    
    if (authError) {
      console.error("Erro ao listar usuários (Admin):", authError);
      return new Response(JSON.stringify({ error: "Erro ao verificar usuário no sistema." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (authUser) {
      const existingUserId = authUser.id;
      console.log(`Usuário legado detectado (ID: ${existingUserId}) para ${normalizedEmail}.`);
      
      const origin = req.headers.get("origin") || "http://localhost:5173";
      console.log(`Gerando link de recuperação com redirect para: ${origin}`);

      const { data: linkData, error: resetError } = await supabaseClient.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo: `${origin}/`
        }
      });

      if (resetError || !linkData) {
          return new Response(JSON.stringify({ error: "Erro ao gerar link de ativação: " + (resetError?.message || "Link não gerado") }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      // 2.1 Enviar E-mail de Ativação via Resend
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
          const actionLink = linkData.properties.action_link;
          const html = `
            <!DOCTYPE html>
            <html>
              <body style="font-family: sans-serif; line-height: 1.6; color: #333; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
                    <h1>Ative sua conta Zafen</h1>
                  </div>
                  <div style="padding: 30px;">
                    <p>Olá! Notamos que você já possui um perfil em nosso sistema.</p>
                    <p>Para ativar seu acesso e visualizar seus filhos vinculados, clique no botão abaixo para definir sua senha:</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${actionLink}" style="background-color: #4F46E5; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Definir Senha e Acessar
                      </a>
                    </div>
                    <p style="font-size: 12px; color: #6b7280;">Se o botão não funcionar, copie este link: ${actionLink}</p>
                  </div>
                </div>
              </body>
            </html>
          `;

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: `Neo Missio <${Deno.env.get("RESEND_FROM_EMAIL") ?? "sistema@neomissio.com.br"}>`,
              to: [normalizedEmail],
              subject: "Ative seu acesso ao Zafen",
              html: html,
            }),
          });
      }

      // Vínculo Automático para usuários existentes
      if (invite.metadata?.existing_student_ids && Array.isArray(invite.metadata.existing_student_ids)) {
          await supabaseClient
              .from("alunos")
              .update({ responsavel_id: existingUserId })
              .in("id", invite.metadata.existing_student_ids);
      }

      await supabaseClient.from("invitations").update({ used_at: new Date().toISOString() }).eq("id", invite.id);

      return new Response(JSON.stringify({ 
        status: "existing_user",
        message: "Sua conta já existe! Enviamos um link de ativação para o seu e-mail.",
        email: normalizedEmail
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Usuário Novo
    const isSelf = invite.metadata?.is_self === true;
    const studentNames: string[] = [];

    if (!isSelf && invite.metadata?.existing_student_ids && Array.isArray(invite.metadata.existing_student_ids)) {
        const { data: students } = await supabaseClient
            .from("alunos")
            .select("nome_completo")
            .in("id", invite.metadata.existing_student_ids);

        if (students) {
            studentNames.push(...students.map((s: any) => s.nome_completo));
        }
    }

    return new Response(JSON.stringify({
      status: "new_user",
      role: invite.role,
      token: invite.token,
      email: invite.email,
      studentNames,
      is_self: isSelf,
      selfName: isSelf ? (invite.metadata?.responsavel_nome ?? "") : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro interno: " + error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
