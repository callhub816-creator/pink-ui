
export async function onRequest({ request, next, env }) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const now = Date.now();
    const minuteAgo = now - 60000;

    // 1. 🛡️ GLOBAL IP RATE LIMIT (60 req/min)
    // Using D1 as a simple counter for this demo, usually KV is better for high scale
    const { count: globalHits } = await env.DB.prepare("SELECT COUNT(*) as count FROM logs WHERE details LIKE ? AND created_at > ?")
        .bind(`%${ip}%`, new Date(minuteAgo).toISOString()).first();

    if (globalHits > 60) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Too many requests from your IP." }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
        });
    }

    const response = await next();

    // 2. 🔒 SECURITY HEADERS (Production Hardening)
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Content-Security-Policy", "default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*; frame-src https://api.razorpay.com; connect-src 'self' https://api.sambanova.ai https://api.elevenlabs.io;");
    newHeaders.set("X-Frame-Options", "DENY");
    newHeaders.set("X-Content-Type-Options", "nosniff");
    newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}
