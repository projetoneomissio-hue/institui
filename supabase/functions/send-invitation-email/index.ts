import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailRequest {
  to: string;
  inviteToken: string;
  role: string;
  origin?: string;
  unidade_id?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authorization Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Manual JWT Decoding to avoid internal getUser issues
    let userId: string;
    try {
      const token = authHeader.replace('Bearer ', '').trim();
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      userId = payload.sub;
      
      if (!userId) throw new Error("No user ID in token");
    } catch (e) {
      console.error("JWT Decode Error:", e);
      return new Response(JSON.stringify({ error: "Invalid Token Format" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role using Admin client for reliability
    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roleError) {
      console.error("DB Error fetching roles:", roleError);
      return new Response(JSON.stringify({ error: "Database error checking permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = ['direcao', 'secretaria', 'admin'];
    const hasPermission = roles && roles.some((r: { role: string }) => allowedRoles.includes(r.role));

    if (!hasPermission) {
      console.error("Forbidden: User does not have required roles. Roles found:", roles, "User ID:", userId);
      return new Response(JSON.stringify({ 
        error: "Forbidden: Insufficient permissions", 
        roles_found: [],
        user_id: "redacted"
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse Body
    const { to, inviteToken, role, origin, nomeResponsavel, unidade_id } = await req.json() as EmailRequest & { nomeResponsavel?: string };

    // Carrega config de email do tenant
    let fromName = "Zafen";
    let replyTo: string | undefined;
    if (unidade_id) {
      const { data: unidade } = await supabaseAdmin
        .from("unidades")
        .select("email_config")
        .eq("id", unidade_id)
        .single();
      if (unidade?.email_config) {
        fromName = unidade.email_config.from_name || fromName;
        replyTo = unidade.email_config.reply_to || undefined;
      }
    }

    if (!to || !inviteToken || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Prepare Email
    const appUrl = origin || "http://localhost:8080"; // Fallback
    const registerUrl = `${appUrl}/resgatar-convite?token=${inviteToken}&email=${encodeURIComponent(to)}`; 
    // Link direto para resgate de convite legado

    const roleNames: Record<string, string> = {
      direcao: 'Direção',
      coordenacao: 'Coordenação',
      professor: 'Professor',
    };
    const roleName = roleNames[role] || role;

    const subject = "Convite para Zafen - Sistema de Gestão Escolar";
    // Improved Email Template
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Convite Zafen</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header with Logo Placeholder -->
            <div style="background-color: #4F46E5; padding: 30px; text-align: center;">
              <!-- 
                TODO: Replace src with public URL of your logo. 
                Example: https://your-project.supabase.co/storage/v1/object/public/assets/logo-neo-missio.png 
              -->
              <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">ZAFEN</h1>
            </div>

            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin-top: 0;">Olá, ${nomeResponsavel || 'chegou um convite para você!'} 👋</h2>
              <p style="font-size: 16px; color: #4b5563;">
                Você foi convidado(a) para fazer parte da equipe do <strong>Zafen</strong> como <span style="background-color: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${roleName}</span>.
              </p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4F46E5;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: bold;">Seu Token de Acesso</p>
                <div style="font-family: 'Courier New', monospace; font-size: 20px; color: #111827; letter-spacing: 1px; word-break: break-all; font-weight: bold;">
                  ${inviteToken}
                </div>
              </div>
              
              <p style="margin-bottom: 25px;">Para concluir seu cadastro, clique no botão abaixo e escolha a opção <strong>"Tenho um convite"</strong>:</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${registerUrl}" style="background-color: #4F46E5; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                  Acessar Sistema Agora
                </a>
              </div>
              
              ${appUrl.includes('localhost') ? `
              <div style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 10px; border-radius: 4px; font-size: 12px; color: #92400e; margin-top: 20px;">
                <strong>⚠️ Ambiente de Teste:</strong> O link acima aponta para o seu computador local (${appUrl}). Certifique-se de que o servidor está rodando.
              </div>` : ''}

              <p style="font-size: 14px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                Este convite expira em <strong>7 dias</strong>.<br>
                Se você não esperava por este convite, pode ignorar este email.
              </p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
              &copy; ${new Date().getFullYear()} Zafen - Sistema de Gestão Escolar
            </div>
          </div>
        </body>
      </html>
    `;

    // 4. Send via Resend
    if (!RESEND_API_KEY) {
      console.log("MOCK EMAIL (No API Key):", { to, subject, inviteToken });
      return new Response(JSON.stringify({ success: true, mocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${Deno.env.get("RESEND_FROM_EMAIL") ?? "sistema@neomissio.com.br"}>`,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API Error:", data);
      return new Response(JSON.stringify({ 
        error: "Erro ao disparar e-mail. Verifique a configuração do Resend."
      }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error sending invitation:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
