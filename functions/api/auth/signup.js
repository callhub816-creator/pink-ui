
export async function onRequestPost({ request, env }) {
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not found." }), { status: 500 });
    }

    try {
        const { username, displayName, password, profileData } = await request.json();

        if (!username || !displayName || !password) {
            return new Response(JSON.stringify({ error: "Username, Name, and Password are required." }), { status: 400 });
        }

        // 1. Check if username taken
        const existingUser = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
        if (existingUser) {
            return new Response(JSON.stringify({ error: "This username is already taken." }), { status: 400 });
        }

        // 2. Hash Password
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        const hashBuffer = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            baseKey,
            256
        );

        const passwordHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
        const passwordSalt = btoa(String.fromCharCode(...salt));

        // 3. Insert into DB
        const userId = crypto.randomUUID();
        await env.DB.prepare(
            "INSERT INTO users (id, username, display_name, password_hash, password_salt, profile_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(userId, username, displayName, passwordHash, passwordSalt, JSON.stringify(profileData || {}), new Date().toISOString()).run();

        // 4. Create Session Cookie (Login immediately after signup)
        const payload = JSON.stringify({ id: userId, username, displayName, exp: Date.now() + (30 * 86400000) }); // 30 Days
        const payloadUint8 = encoder.encode(payload);
        const payloadB64 = btoa(String.fromCharCode(...payloadUint8));

        const secret = env.JWT_SECRET || "default_hush_hush_secret";
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("HMAC", key, payloadUint8);
        const token = payloadB64 + "." + btoa(String.fromCharCode(...new Uint8Array(signature)));

        return new Response(JSON.stringify({
            success: true,
            token,
            user: { id: userId, username, displayName }
        }), {
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
