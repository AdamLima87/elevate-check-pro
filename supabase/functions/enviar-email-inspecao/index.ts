import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email_cliente, 
      nome_estabelecimento, 
      cnpj, 
      data_inspecao, 
      conformidade, 
      classificacao, 
      link_resultado 
    } = await req.json();

    if (!email_cliente) {
      throw new Error("E-mail do cliente é obrigatório");
    }

    const classificacaoLabel = (classificacao?.label || "N/A").toUpperCase();
    const classificacaoTone = (classificacao?.tone || "warning");
    const formattedConformidade = Number(conformidade || 0).toFixed(2);

    let badgeColor = "#f59e0b"; // warning
    let badgeIcon = "⚠️";
    if (classificacaoTone === "success") {
      badgeColor = "#1a4d2e";
      badgeIcon = "✅";
    } else if (classificacaoTone === "destructive") {
      badgeColor = "#dc2626";
      badgeIcon = "❌";
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; border: 1px solid #eee; }
    .header { background-color: #1a4d2e; color: white; padding: 30px; text-align: center; }
    .logo { max-width: 150px; margin-bottom: 20px; }
    .content { padding: 30px; }
    .title { font-size: 20px; font-weight: bold; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .score-box { background-color: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px; }
    .score-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 4px; color: white; font-weight: bold; font-size: 14px; margin-top: 5px; }
    .btn { display: inline-block; background-color: #1a4d2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .instructions { background-color: #f1f5f9; padding: 20px; border-radius: 8px; font-size: 14px; margin-top: 30px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://notify.elevareconsultoria.com/logo-white.png" alt="Elevare" class="logo" onerror="this.style.display='none'">
      <h1>Relatório Disponível</h1>
    </div>
    <div class="content">
      <div class="title">Seu Relatório de Inspeção está disponível</div>
      <p>Olá, o relatório da inspeção realizada no seu estabelecimento foi finalizado.</p>
      
      <div style="margin: 20px 0;">
        <strong>Estabelecimento:</strong> ${nome_estabelecimento}<br>
        <strong>Data da Inspeção:</strong> ${new Date(data_inspecao).toLocaleDateString("pt-BR")}
      </div>

      <div class="score-box">
        <div style="font-size: 14px; color: #64748b; text-transform: uppercase;">Percentual de Conformidade</div>
        <div class="score-value" style="color: ${badgeColor}">${formattedConformidade}%</div>
        <div class="badge" style="background-color: ${badgeColor}">${badgeIcon} ${classificacaoLabel}</div>
      </div>

      <div style="text-align: center;">
        <a href="${link_resultado}" class="btn">Acessar meu resultado</a>
      </div>

      <div class="instructions">
        <strong>Instruções de acesso:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Selecione <strong>'Cliente'</strong> na tela de login</li>
          <li><strong>E-mail de acesso:</strong> ${email_cliente}</li>
          <li><strong>Senha:</strong> ${cnpj.replace(/\D/g, "")} (somente números)</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      Elevare Consultoria · <a href="https://elevareconsultoria.com">elevareconsultoria.com</a> · (11) 99484-0948
    </div>
  </div>
</body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Elevare Consultoria <noreply@elevareconsultoria.com>",
        to: [email_cliente],
        subject: "Seu Relatório de Inspeção está disponível",
        html: htmlContent,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      throw new Error(resData.message || "Falha ao enviar e-mail via Resend");
    }

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
