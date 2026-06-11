import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PAYMENT_REMINDER_TEMPLATE } from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface PaymentReminderRequest {
  to: string;
  responsavelNome: string;
  alunoNome: string;
  atividadeNome: string;
  turmaNome: string; // Kept for interface compatibility, even if not explicitly used in template yet
  valorDevido: number;
  diasAtraso: number;
  dataVencimento: string; // YYYY-MM-DD
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      to,
      responsavelNome,
      alunoNome,
      atividadeNome,
      turmaNome,
      valorDevido,
      diasAtraso,
      dataVencimento,
    }: PaymentReminderRequest = await req.json();

    const subject = `Lembrete de Pagamento - ${alunoNome}`;

    // Construct payment link (mock or real if available)
    // For now, redirect to the portal
    const linkPagamento = "https://neomissio.com/financeiro";

    const html = PAYMENT_REMINDER_TEMPLATE(
      responsavelNome,
      alunoNome,
      atividadeNome,
      valorDevido,
      diasAtraso,
      linkPagamento
    );

    // Fallback: If no API key, log to console (Dev mode)
    if (!RESEND_API_KEY) {
      console.log("------------------------------------------------");
      console.log("📧 [MOCK PAYMENT REMINDER] RESEND_API_KEY is missing.");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Dias Atraso: ${diasAtraso}`);
      console.log("------------------------------------------------");
      return new Response(JSON.stringify({ success: true, mocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Neo Missio Financeiro <sistema@neomissio.com>", // Updated to official domain
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API Error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error sending payment reminder:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
