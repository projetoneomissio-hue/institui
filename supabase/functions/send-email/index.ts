import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
    WELCOME_EMAIL_TEMPLATE,
    MATRICULA_SOLICITADA_TEMPLATE,
    MATRICULA_APROVADA_TEMPLATE,
    NOVA_MATRICULA_ADMIN_TEMPLATE
} from "../_shared/email-templates.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    to: string;
    type: "welcome" | "custom" | "matricula_solicitada" | "matricula_aprovada" | "nova_matricula_admin";
    subject?: string;
    html?: string;
    unidade_id?: string;
    data?: {
        nomeResponsavel?: string;
        nomeAluno?: string;
        atividade?: string;
        unidade?: string;
    };
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { to, type, subject: reqSubject, html: reqHtml, data, unidade_id }: EmailRequest = await req.json();

        // Carrega config de email do tenant (from_name + reply_to)
        let fromName = "Zafen";
        let replyTo: string | undefined;
        if (unidade_id) {
            const admin = createClient(
                Deno.env.get("SUPABASE_URL") ?? "",
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
            );
            const { data: unidade } = await admin
                .from("unidades")
                .select("email_config")
                .eq("id", unidade_id)
                .single();
            if (unidade?.email_config) {
                fromName = unidade.email_config.from_name || fromName;
                replyTo = unidade.email_config.reply_to || undefined;
            }
        }

        let subject = reqSubject;
        let html = reqHtml;

        // Use functionality mapping
        if (type === "welcome" && data?.nomeResponsavel && data?.nomeAluno) {
            subject = "Bem-vindo ao NeoMissio!";
            html = WELCOME_EMAIL_TEMPLATE(data.nomeResponsavel, data.nomeAluno);
        } else if (type === "matricula_solicitada" && data?.nomeResponsavel && data?.nomeAluno && data?.atividade) {
            subject = "Recebemos sua solicitação de matrícula!";
            html = MATRICULA_SOLICITADA_TEMPLATE(data.nomeResponsavel, data.nomeAluno, data.atividade);
        } else if (type === "matricula_aprovada" && data?.nomeResponsavel && data?.nomeAluno && data?.atividade) {
            subject = "Matrícula Aprovada! Boas-vindas oficiais 🎉";
            html = MATRICULA_APROVADA_TEMPLATE(data.nomeResponsavel, data.nomeAluno, data.atividade);
        } else if (type === "nova_matricula_admin" && data?.nomeAluno && data?.atividade) {
            subject = `[Nova Matrícula Pendente] ${data.nomeAluno} - ${data.atividade}`;
            html = NOVA_MATRICULA_ADMIN_TEMPLATE(data.nomeAluno, data.atividade, data.unidade);
        }

        if (!subject || !html) {
            throw new Error("Missing subject or html content");
        }

        // Fallback: If no API key, log to console (Dev mode)
        if (!RESEND_API_KEY) {
            console.log("------------------------------------------------");
            console.log("📧 [MOCK EMAIL] RESEND_API_KEY is missing.");
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log("------------------------------------------------");
            return new Response(JSON.stringify({ success: true, mocked: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "sistema@neomissio.com.br";
        const resendPayload: Record<string, unknown> = {
            from: `${fromName} <${fromEmail}>`,
            to: [to],
            subject: subject,
            html: html,
        };
        if (replyTo) resendPayload.reply_to = replyTo;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify(resendPayload),
        });

        const resData = await res.json();

        if (!res.ok) {
            console.error("Resend API Error:", resData);
            return new Response(JSON.stringify({ error: resData }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(resData), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Error sending email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

serve(handler);
