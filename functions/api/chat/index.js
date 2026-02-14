export async function onRequestGet({ request, params, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. Auth Check
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")));
    const token = cookies["auth_token"];
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let userId;
    try {
        const parts = token.split(".");
        if (parts.length !== 2) throw new Error("Invalid token format");
        const payloadStr = atob(parts[0]);
        const payload = JSON.parse(payloadStr);
        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    // 2. Fetch Messages
    // URL pattern: /api/chat/:id (but Pages Functions passes it differently)
    // Actually we might need query param ?chatId=... if using index.js in api/chat/
    // Let's assume ?chatId=... for simplicity.
    const url = new URL(request.url);
    const chatId = url.searchParams.get("chatId"); // e.g. 'persona_1'

    if (!chatId) return new Response(JSON.stringify({ error: "Missing chatId" }), { status: 400 });

    try {
        // Fetch last 50 messages
        const { results } = await env.DB.prepare(
            "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC LIMIT 100"
        ).bind(chatId).all();

        return new Response(JSON.stringify({ messages: results || [] }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
