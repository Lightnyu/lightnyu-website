const services = new Set(["Websites & audits", "Free website audit", "Software", "Something else"]);
const unavailable = () => Response.json({error:"Your enquiry could not be saved right now. Please try again later, or contact me through Instagram."}, {status:503});
const schema = `CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  consent INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

async function enquiry(request, env) {
  if (request.method !== "POST") return Response.json({error:"Please use the enquiry form."}, {status:405, headers:{Allow:"POST"}});
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({error:"This enquiry could not be accepted."}, {status:403});
  if (!request.headers.get("Content-Type")?.includes("application/json")) return Response.json({error:"Please use the enquiry form."}, {status:415});
  if (Number(request.headers.get("Content-Length") || "0") > 24000) return Response.json({error:"Please shorten your enquiry."}, {status:413});
  try {
    const raw = await request.text();
    if (raw.length > 16000) return Response.json({error:"Please shorten your enquiry."}, {status:413});
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object") return Response.json({error:"Please complete all fields."}, {status:400});
    const text = key => typeof body[key] === "string" ? body[key].trim() : "";
    if (text("website")) return Response.json({saved:true}, {status:201});
    const name = text("name"), email = text("email"), service = text("service"), message = text("message");
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !services.has(service) || message.length < 20 || message.length > 5000 || text("consent") !== "yes") {
      return Response.json({error:"Please add your name, a valid email, a service and at least 20 characters about your project. Consent is required."}, {status:400});
    }
    // This dedicated binding never uses another site's existing database.
    if (!env.ANATOLII_DB) return unavailable();
    await env.ANATOLII_DB.prepare(schema).run();
    await env.ANATOLII_DB.prepare("INSERT INTO enquiries (name,email,service,message,consent) VALUES (?,?,?,?,?)").bind(name,email,service,message,1).run();
    return Response.json({saved:true}, {status:201});
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({error:"The enquiry format was invalid. Please try again."}, {status:400});
    console.error("Enquiry storage unavailable");
    return unavailable();
  }
}

export default {
  async fetch(request, env) {
    const response = new URL(request.url).pathname === "/api/enquiries"
      ? await enquiry(request, env)
      : await env.ASSETS.fetch(request);
    if (new URL(request.url).pathname.startsWith("/api/")) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-store");
      headers.set("X-Content-Type-Options", "nosniff");
      return new Response(response.body, {status:response.status, headers});
    }
    return response;
  }
};
