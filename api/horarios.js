// api/horarios.js
export const config = { runtime: "edge" };

// Pon tu URL de Railway aquí o usa la env var BACKEND_URL en Vercel
const UPSTREAM =
  process.env.BACKEND_URL ||
  "https://horarios-universitarios-prod.up.railway.app";

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    // Conservamos el querystring (?filtro=...)
    const upstreamUrl = `${UPSTREAM}/horarios${url.search || ""}`;

    // Pasamos el Authorization del cliente al backend
    const auth = req.headers.get("authorization") || "";

    const res = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Authorization: auth },
    });

    // Devolvemos el body tal cual y status/headers básicos
    return new Response(res.body, {
      status: res.status,
      headers: {
        "content-type":
          res.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    // Error controlado para que el frontend reciba algo legible
    return new Response(
      JSON.stringify({ error: "Proxy error", detail: String(err) }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }
}
