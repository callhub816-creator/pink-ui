
export async function onRequestPost({ request, env }) {
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not found." }), { status: 500 });
    }

    try {
        const { email, password } = await request.json();

        // 1. Get user from DB
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (!user) {
            return new Response(JSON.stringify({ error: "Invalid email or password." }), { status: 401 });
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
            return new Response(JSON.stringify({ error: "Invalid email or password." }), { status: 401 });
        }

        // 3. Create Session (Simple JWT-like signed cookie)
        const payload = JSON.stringify({ id: user.id, email: user.email, exp: Date.now() + 86400000 });
        const secret = env.JWT_SECRET || "default_hush_hush_secret";

        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
        const token = btoa(payload) + "." + btoa(String.fromCharCode(...new Uint8Array(signature)));

        return new Response(JSON.stringify({
            success: true,
            user: { id: user.id, email: user.email }
        }), {
            headers: {
                "Content-Type": "application/json",
                "Set-Cookie": `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
