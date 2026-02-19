import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { certificado_id, html } = req.body

    if (!certificado_id || !html) {
      return res.status(400).json({ error: "Missing data" })
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true
    })

    await browser.close()

    const fileName = `${certificado_id}.pdf`

    const { error } = await supabase.storage
      .from("certificados")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true
      })

    if (error) throw error

    const { data } = supabase.storage
      .from("certificados")
      .getPublicUrl(fileName)

    await supabase
      .from("certificados")
      .update({ pdf_url: data.publicUrl })
      .eq("id", certificado_id)

    return res.status(200).json({
      pdf_url: data.publicUrl
    })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error generando PDF" })
  }
}
