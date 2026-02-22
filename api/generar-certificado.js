import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { supabaseAdmin } from "../lib/supabaseAdmin";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { certificado_id, html } = req.body;

    if (!certificado_id || !html) {
      return res.status(400).json({ error: "Missing certificado_id or html" });
    }

    // Lanzar navegador compatible con Vercel
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
    });

    await browser.close();

    const fileName = `${certificado_id}.pdf`;

    // Subir PDF a Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("certificados")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obtener URL pública
    const { data } = supabaseAdmin.storage
      .from("certificados")
      .getPublicUrl(fileName);

    const publicUrl = data.publicUrl;

    // Guardar URL en tabla certificados
    const { error: updateError } = await supabaseAdmin
      .from("certificados")
      .update({ pdf_url: publicUrl })
      .eq("id", certificado_id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      pdf_url: publicUrl,
    });

  } catch (err) {
    console.error("Error generando certificado:", err);
    return res.status(500).json({
      error: "Error generando PDF",
      detail: err.message,
    });
  }
}