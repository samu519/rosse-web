export async function customerRegistry(request, db) {
  const headers = {"Cache-Control": "no-store"};
  const json = (data, status = 200) => Response.json(data, {status, headers});
  if (request.method === "GET") {
    const {results} = await db.prepare(
      "SELECT name, email, created_at FROM reminder_customers ORDER BY created_at DESC, id DESC LIMIT 100"
    ).all();
    return json(results);
  }
  if (request.method !== "POST") return json("Método no permitido", 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json("Origen inválido", 403);
  }
  const fields = await request.json().catch(() => null);
  const name = typeof fields?.name === "string" ? fields.name.trim() : "";
  const email = typeof fields?.email === "string" ? fields.email.trim().toLowerCase() : "";
  if (!name || name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json("Revisa el nombre y el correo.", 400);
  }
  const result = await db.prepare(
    "INSERT INTO reminder_customers (id, name, email) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING"
  ).bind(crypto.randomUUID(), name, email).run();
  return result.meta.changes ? json("Cliente registrado.", 201) : json("Ese correo ya está registrado.", 409);
}
