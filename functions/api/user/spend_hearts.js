
export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. 🔒 AUTH CHECK
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";
    let token = null;
    if (authHeader.startsWith("Bearer ")) token = authHeader.substring(7);
    else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
        token = cookies["auth_token"];
    }

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let userId;
    try {
        const parts = token.split(".");
        const payloadB64 = parts.length === 3 ? parts[1] : parts[0];
        const signatureB64 = parts.length === 3 ? parts[2] : parts[1];
        const payload = JSON.parse(atob(payloadB64));

        if (payload.exp < Date.now()) return new Response(JSON.stringify({ error: "Session expired" }), { status: 401 });

        const secret = env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        const isValid = await crypto.subtle.verify("HMAC", key, new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0))), encoder.encode(atob(payloadB64)));

        if (!isValid) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Auth failed" }), { status: 401 });
    }

    try {
        const { amount, reason } = await request.json();
        if (!amount || amount <= 0) return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400 });

        // 🛡️ ATOMIC DEBIT (SQL Level)
        const result = await env.DB.prepare(`
            UPDATE users 
            SET profile_data = json_set(profile_data, '$.hearts', CAST(json_extract(profile_data, '$.hearts') AS INTEGER) - ?)
            WHERE id = ? AND CAST(json_extract(profile_data, '$.hearts') AS INTEGER) >= ?
        `).bind(amount, userId, amount).run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: "Insufficient hearts" }), { status: 400 });
        }

        // Fetch remaining for frontend sync
        const userRow = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(userId).first();
        const updatedProfile = JSON.parse(userRow.profile_data);

        return new Response(JSON.stringify({ success: true, hearts: updatedProfile.hearts, profile: updatedProfile }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
