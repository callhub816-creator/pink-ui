export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")));
    const token = cookies["auth_token"];

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    try {
        const [payloadB64, signatureB64] = token.split(".");
        const payloadStr = atob(payloadB64);
        const payload = JSON.parse(payloadStr);

        // Verify Signature
        const encoder = new TextEncoder();
        const secret = env.JWT_SECRET || "default_hush_hush_secret";
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        const signature = new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0)));
        const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadStr));

        if (!isValid || payload.exp < Date.now()) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });

        const { profileData } = await request.json();

        // 🛡️ [SECURITY LOCK] Fetch Existing Data First to Prevent Overwrite
        const { results } = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(payload.id).all();

        if (!results || results.length === 0) {
            return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
        }

        const existingProfile = JSON.parse(results[0].profile_data || "{}");

        // 🔒 ALLOWED FIELDS ONLY (Whitelist)
        // User cannot update 'hearts', 'subscription_tier', 'messages_count' from client.
        const safeUpdate = {
            ...existingProfile,
            displayName: profileData.displayName || existingProfile.displayName,
            avatarUrl: profileData.avatarUrl || existingProfile.avatarUrl,
            bio: profileData.bio || existingProfile.bio,
            preferred_reply_language: profileData.preferred_reply_language || existingProfile.preferred_reply_language,
            // Keep critical fields from SERVER state
            hearts: existingProfile.hearts ?? 10,
            subscription_tier: existingProfile.subscription_tier ?? 'free',
            subscription_expires_at: existingProfile.subscription_expires_at ?? null
        };

        // Update DB with SAFE data
        await env.DB.prepare("UPDATE users SET profile_data = ? WHERE id = ?")
            .bind(JSON.stringify(safeUpdate), payload.id)
            .run();

        return new Response(JSON.stringify({ success: true, profile: safeUpdate }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
