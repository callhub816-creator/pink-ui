
export async function onRequestPost({ request, env }) {
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 Database binding 'DB' not found." }), { status: 500 });
    }

    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and Password are required." }), { status: 400 });
        }

        // 1. Check if user already exists
        const existingUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
        if (existingUser) {
            return new Response(JSON.stringify({ error: "User already exists with this email." }), { status: 400 });
        }

        // 2. Hash Password (PBKDF2 - standard for WebCrypto)
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
            "INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(userId, email, passwordHash, passwordSalt, new Date().toISOString()).run();

        return new Response(JSON.stringify({
            success: true,
            message: "Signup successful!",
            user: { id: userId, email }
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
