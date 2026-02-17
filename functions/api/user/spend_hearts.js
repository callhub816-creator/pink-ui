
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

        // 1. 🛡️ STRICT VALIDATION (Overflow & Type)
        if (typeof amount !== 'number' || amount <= 0 || amount > 1000) {
            return new Response(JSON.stringify({ error: "Suspicious amount detected" }), { status: 400 });
        }

        // 2. 🕵️ ABNORMAL BEHAVIOR DETECTION (Rate Limit: 5 Spends per 60s)
        const minuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count: recentSpends } = await env.DB.prepare("SELECT COUNT(*) as count FROM wallet_audit_log WHERE user_id = ? AND created_at > ?")
            .bind(userId, minuteAgo).first();

        if (recentSpends >= 5) {
            return new Response(JSON.stringify({ error: "Too many transactions. Wait a minute." }), { status: 429 });
        }

        // 3. 💾 ATOMIC DEBIT + AUDIT TRAIL
        const userRowBefore = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(userId).first();
        const profileBefore = JSON.parse(userRowBefore.profile_data);
        const oldBalance = profileBefore.hearts || 0;

        if (oldBalance < amount) return new Response(JSON.stringify({ error: "Insufficient hearts" }), { status: 400 });

        const newBalance = oldBalance - amount;
        const nowIso = new Date().toISOString();
        const ip = request.headers.get("cf-connecting-ip") || "unknown";

        await env.DB.batch([
            env.DB.prepare(`
                UPDATE users 
                SET profile_data = json_set(profile_data, '$.hearts', ?)
                WHERE id = ? 
            `).bind(newBalance, userId),
            env.DB.prepare(`
                INSERT INTO wallet_audit_log (id, user_id, change_amount, new_balance, action, reason, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(crypto.randomUUID(), userId, -amount, newBalance, 'spend', reason || "manual_spend", ip, nowIso)
        ]);

        return new Response(JSON.stringify({ success: true, hearts: newBalance, profile: { ...profileBefore, hearts: newBalance } }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
