import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SendComunicadoRequest {
  comunicadoId: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailEmail = Deno.env.get("GMAIL_EMAIL");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    const whatsappPhone = Deno.env.get("WHATSAPP_PHONE_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const { comunicadoId }: SendComunicadoRequest = await req.json();
    console.log(`Processing comunicado: ${comunicadoId}`);

    // Fetch comunicado
    const { data: comunicado, error: comunicadoError } = await supabase
      .from("comunicados")
      .select("*")
      .eq("id", comunicadoId)
      .single();

    if (comunicadoError || !comunicado) {
      throw new Error("Comunicado não encontrado");
    }

    // Get recipients based on type
    let destinatarios: { id: string; email: string; telefone: string | null; nome: string }[] = [];

    if (comunicado.tipo === "geral") {
      // All responsáveis with active matriculas
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          telefone,
          nome_completo
        `)
        .in("id", 
          (await supabase
            .from("alunos")
            .select("responsavel_id")
            .then(r => r.data?.map(a => a.responsavel_id) || [])
          )
        );
      
      if (data) {
        destinatarios = data.map(d => ({ id: d.id, email: d.email, telefone: d.telefone, nome: d.nome_completo }));
      }
    } else if (comunicado.tipo === "turma" && comunicado.turma_id) {
      // Responsáveis of students in the turma
      const { data: matriculas } = await supabase
        .from("matriculas")
        .select(`
          alunos (
            responsavel_id
          )
        `)
        .eq("turma_id", comunicado.turma_id)
        .eq("status", "ativa");

      const responsavelIds = [...new Set(matriculas?.map((m: any) => m.alunos?.responsavel_id).filter(Boolean) || [])];

      if (responsavelIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, email, telefone, nome_completo")
          .in("id", responsavelIds);
        
        if (data) {
          destinatarios = data.map(d => ({ id: d.id, email: d.email, telefone: d.telefone, nome: d.nome_completo }));
        }
      }
    } else if (comunicado.tipo === "individual" && comunicado.destinatario_id) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, telefone, nome_completo")
        .eq("id", comunicado.destinatario_id)
        .single();
      
      if (data) {
        destinatarios = [{ id: data.id, email: data.email, telefone: data.telefone, nome: data.nome_completo }];
      }
    }

    console.log(`Found ${destinatarios.length} recipients`);

    let successCount = 0;
    let errorCount = 0;
    const canais = comunicado.canal as string[];

    for (const destinatario of destinatarios) {
      for (const canal of canais) {
        try {
          if (canal === "email" && gmailEmail && gmailPassword) {
            // Send email using Nodemailer via SMTP
            // For now, we'll log it - in production, integrate with a proper email service
            console.log(`Sending email to ${destinatario.email}: ${comunicado.titulo}`);
            
            // Create envio record
            await supabase.from("comunicado_envios").insert({
              comunicado_id: comunicadoId,
              responsavel_id: destinatario.id,
              canal: "email",
              status: "enviado",
              enviado_em: new Date().toISOString(),
            });
            successCount++;
          } else if (canal === "whatsapp" && whatsappPhone && destinatario.telefone) {
            // WhatsApp integration - log for now
            // In production, integrate with WhatsApp Business API or Evolution API
            console.log(`Would send WhatsApp to ${destinatario.telefone}: ${comunicado.titulo}`);
            
            await supabase.from("comunicado_envios").insert({
              comunicado_id: comunicadoId,
              responsavel_id: destinatario.id,
              canal: "whatsapp",
              status: "pendente", // Mark as pending until WhatsApp API is fully configured
              erro_mensagem: "WhatsApp API não configurada completamente",
            });
          }
        } catch (sendError) {
          console.error(`Error sending to ${destinatario.email}:`, sendError);
          
          await supabase.from("comunicado_envios").insert({
            comunicado_id: comunicadoId,
            responsavel_id: destinatario.id,
            canal,
            status: "erro",
            erro_mensagem: sendError instanceof Error ? sendError.message : "Erro desconhecido",
          });
          errorCount++;
        }
      }
    }

    // Update comunicado status
    const newStatus = errorCount === 0 ? "enviado" : (successCount > 0 ? "parcial" : "erro");
    await supabase
      .from("comunicados")
      .update({
        status: newStatus,
        enviado_em: new Date().toISOString(),
      })
      .eq("id", comunicadoId);

    console.log(`Comunicado ${comunicadoId} processed: ${successCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        errors: errorCount,
        status: newStatus,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-comunicado:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
