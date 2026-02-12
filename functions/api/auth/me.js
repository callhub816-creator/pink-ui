
export async function onRequestGet({ request, env }) {
    // Check both Cookie and Authorization header
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";

    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
        token = cookies["auth_token"];
    }

    if (!token) {
        return new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 });
    }

    try {
        const [payloadB64, signatureB64] = token.split(".");

        const decoder = new TextDecoder();
        const payloadUint8 = new Uint8Array(atob(payloadB64).split("").map(c => c.charCodeAt(0)));
        const payloadStr = decoder.decode(payloadUint8);
        const payload = JSON.parse(payloadStr);

        // Check expiration
        if (payload.exp < Date.now()) {
            return new Response(JSON.stringify({ error: "Session expired" }), { status: 401 });
        }

        // Verify Signature
        const encoder = new TextEncoder();
        const secret = env.JWT_SECRET || "default_hush_hush_secret";
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );

        const signature = new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0)));
        const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadStr));

        if (!isValid) {
            return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
        }

        // Fetch latest profile from DB
        if (env.DB) {
            const user = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(payload.id).first();
            if (user) {
                payload.profileData = JSON.parse(user.profile_data || "{}");
            }
        }

        return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({
            error: "Auth failed",
            details: err.message
        }), { status: 401 });
    }
}
