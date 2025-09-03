// api/horarios.js  (Node Serverless Function en Vercel)
export default async function handler(req, res) {
  try {
    const filtro = (req.query?.filtro ?? "todos").toString();

    // NO hardcodees la URL: léela de la env var VITE_API_BASE_URL
    const upstream =
      process.env.VITE_API_BASE_URL; 

    if (!upstream) {
      return res
        .status(500)
        .json({ error: "Falta VITE_API_BASE_URL en variables de entorno" });
    }

    // Pasamos Authorization del cliente al backend
    const auth = req.headers["authorization"] || "";

    const r = await fetch(
      `${upstream}/horarios?filtro=${encodeURIComponent(filtro)}`,
      {
        method: "GET",
        headers: { Authorization: auth },
      }
    );

    res.status(r.status);
    const ct = r.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);

    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res
      .status(502)
      .json({ error: "Proxy error", detail: String(e?.message || e) });
  }
}
