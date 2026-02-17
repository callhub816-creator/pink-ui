
export async function onRequestPost({ request, env }) {
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not found." }), { status: 500 });
    }

    try {
        const { username, password } = await request.json();

        // 1. Get user from DB
        const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
        if (!user) {
            return new Response(JSON.stringify({ error: "Invalid username or password." }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. Verify Password
        const salt = new Uint8Array(atob(user.password_salt).split("").map(c => c.charCodeAt(0)));
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

        const currentHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

        if (currentHash !== user.password_hash) {
            return new Response(JSON.stringify({ error: "Invalid username or password." }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 3. Create Session (Access Token: 15 Mins, Refresh Token: 30 Days)
        const exp = Date.now() + (15 * 60 * 1000); // 15 Mins
        const payload = JSON.stringify({ id: user.id, username: user.username, displayName: user.display_name, exp });
        const payloadUint8 = encoder.encode(payload);
        const payloadB64 = btoa(String.fromCharCode(...payloadUint8));

        const secret = env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET missing");
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("HMAC", key, payloadUint8);
        const accessToken = payloadB64 + "." + btoa(String.fromCharCode(...new Uint8Array(signature)));

        // 4. Create Refresh Token
        const refreshToken = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))));
        const refreshExp = Date.now() + (30 * 86400000);

        await env.DB.batch([
            env.DB.prepare("INSERT INTO sessions (id, user_id, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), user.id, refreshToken, refreshExp, new Date().toISOString()),
            env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(crypto.randomUUID(), user.id, 'login', JSON.stringify({ ip: request.headers.get("cf-connecting-ip") || "unknown" }), new Date().toISOString())
        ]);

        return new Response(JSON.stringify({
            success: true,
            user: { id: user.id, username: user.username, displayName: user.display_name },
            profileData: JSON.parse(user.profile_data || "{}")
        }), {
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": [
                    `auth_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`,
                    `refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
                ].join(', ')
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
