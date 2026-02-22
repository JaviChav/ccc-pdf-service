import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { empresa_id } = req.query

    if (!empresa_id) {
      return res.status(400).json({ error: "empresa_id requerido" })
    }

    const { data, error } = await supabase
      .from("v_dashboard_ejecutivo")
      .select("*")
      .eq("empresa_id", empresa_id)
      .order("mes", { ascending: false })

    if (error) throw error

    return res.status(200).json({ data })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: "Error obteniendo dashboard" })
  }
}