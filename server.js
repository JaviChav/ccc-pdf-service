import dotenv from "dotenv"
dotenv.config()

import express from "express"
import puppeteer from "puppeteer"
import { createClient } from "@supabase/supabase-js"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json({ limit: "10mb" }))

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

app.post("/generar-certificado", async (req, res) => {
  try {
    const { certificado_id, html } = req.body

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true
    })

    await browser.close()

    const fileName = `certificados/${certificado_id}.pdf`

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

    res.json({ pdf_url: data.publicUrl })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Error generando PDF" })
  }
})

app.listen(4000, () => {
  console.log("PDF Service corriendo en puerto 4000")
})
