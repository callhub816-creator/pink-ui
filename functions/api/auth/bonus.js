export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. 🔒 AUTH CHECK
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";

    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
        token = cookies["auth_token"];
    }

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    try {
        const [payloadB64, signatureB64] = token.split(".");
        const payloadStr = atob(payloadB64);
        const payload = JSON.parse(payloadStr);

        // Verify Signature (Simple check same as other endpoints)
        const encoder = new TextEncoder();
        const secret = env.JWT_SECRET || "default_hush_hush_secret";
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        const signature = new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0)));
        const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadStr));

        if (!isValid || payload.exp < Date.now()) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });

        const userId = payload.id;
        const today = new Date().toDateString();

        // 2. Fetch User Profile
        const user = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(userId).first();
        if (!user) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

        const profile = JSON.parse(user.profile_data || "{}");

        // 3. Check if already claimed
        if (profile.lastDailyBonusClaim === today) {
            return new Response(JSON.stringify({ error: "Already claimed today" }), { status: 400 });
        }

        // 4. Update Profile
        const bonusAmount = 10;
        const newRecord = {
            id: Date.now().toString(),
            type: 'bonus',
            amount: bonusAmount,
            label: 'Daily Login Bonus',
            timestamp: new Date().toISOString()
        };

        const updatedProfile = {
            ...profile,
            hearts: (parseInt(profile.hearts) || 0) + bonusAmount,
            lastDailyBonusClaim: today,
            earningsHistory: [newRecord, ...(profile.earningsHistory || [])].slice(0, 50)
        };

        await env.DB.prepare("UPDATE users SET profile_data = ? WHERE id = ?")
            .bind(JSON.stringify(updatedProfile), userId)
            .run();

        // 5. Audit Log
        await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)")
            .bind(crypto.randomUUID(), userId, 'claim_bonus', JSON.stringify({ amount: bonusAmount }), new Date().toISOString())
            .run();

        return new Response(JSON.stringify({ success: true, profile: updatedProfile }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
