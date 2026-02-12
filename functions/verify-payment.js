export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    // 1. 🔒 AUTH CHECK (JWT)
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")));
    const token = cookies["auth_token"];
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    let userId;
    try {
        const [payloadB64, signatureB64] = token.split(".");
        const payloadStr = atob(payloadB64);
        const payload = JSON.parse(payloadStr);

        const encoder = new TextEncoder();
        const secret = env.JWT_SECRET || "default_hush_hush_secret";
        const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
        const signature = new Uint8Array(atob(signatureB64).split("").map(c => c.charCodeAt(0)));
        const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payloadStr));

        if (!isValid || payload.exp < Date.now()) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Auth failed" }), { status: 401 });
    }

    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await request.json();

        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            // 📝 LOG FAILURE
            await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'payment_fail_params', JSON.stringify({ razorpay_order_id }), new Date().toISOString()).run();
            return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
        }

        const secret = env.RAZORPAY_KEY_SECRET;
        if (!secret) return new Response(JSON.stringify({ error: "Server config error" }), { status: 500 });

        // 2. 🛡️ VERIFY SIGNATURE
        const generatedSignature = await generateHmacSha256(`${razorpay_order_id}|${razorpay_payment_id}`, secret);
        if (generatedSignature !== razorpay_signature) {
            // 📝 LOG FAILURE
            await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'payment_fail_sig', JSON.stringify({ razorpay_order_id }), new Date().toISOString()).run();
            return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
        }

        // 3. 🛑 IDEMPOTENCY CHECK (Prevent Replay Attack)
        const { results: existingOrder } = await env.DB.prepare("SELECT id FROM processed_orders WHERE order_id = ?").bind(razorpay_order_id).all();
        if (existingOrder && existingOrder.length > 0) {
            return new Response(JSON.stringify({ success: true, message: "Order already processed" }), { headers: { "Content-Type": "application/json" } });
        }

        // 4. 💰 FETCH ORDER DETAILS
        const keyId = env.RAZORPAY_KEY_ID;
        const auth = btoa(`${keyId}:${secret}`);
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
            headers: { "Authorization": `Basic ${auth}` }
        });

        if (!orderRes.ok) throw new Error("Failed to fetch order from Razorpay");
        const orderData = await orderRes.json();
        const amountPaid = orderData.amount_paid || orderData.amount; // paise

        // 5. 🧮 CALCULATE HEARTS (Strict Map)
        let heartsToAdd = 0;
        if (amountPaid === 9900) heartsToAdd = 55;
        else if (amountPaid === 19900) heartsToAdd = 120;
        else if (amountPaid === 49900) heartsToAdd = 350;
        else {
            // 📝 LOG FAILURE
            await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'payment_fail_amount', JSON.stringify({ amountPaid, razorpay_order_id }), new Date().toISOString()).run();
            return new Response(JSON.stringify({ error: "Invalid amount paid" }), { status: 400 });
        }

        // 6. 💾 ATOMIC UPDATE (SQL-Level Increment + Mark Processed)
        // Using json_patch logic: Update hearts = hearts + X
        // SQLite/D1 does not natively support json_set with arithmetic easily in standard update without full replace if old value is unknown in same statement.
        // BUT we can use: UPDATE users SET profile_data = json_patch(profile_data, json_object('hearts', json_extract(profile_data, '$.hearts') + ?))
        // NOTE: D1's SQLite version supports json_patch.

        await env.DB.batch([
            env.DB.prepare(`
                UPDATE users 
                SET profile_data = json_set(profile_data, '$.hearts', CAST(json_extract(profile_data, '$.hearts') AS INTEGER) + ?)
                WHERE id = ?
            `).bind(heartsToAdd, userId),
            env.DB.prepare("INSERT INTO processed_orders (id, user_id, order_id, amount, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, razorpay_order_id, amountPaid, new Date().toISOString())
        ]);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Payment verified & Hearts added",
                added: heartsToAdd
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (err) {
        // 📝 LOG CRITICAL ERROR
        if (userId) {
            const logId = crypto.randomUUID();
            // Best effort logging
            try {
                await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(logId, userId, 'payment_error_catch', JSON.stringify({ error: err.message }), new Date().toISOString()).run();
            } catch (e) { }
        }
        return new Response(JSON.stringify({ error: "Verification failed", detail: err.message }), { status: 500 });
    }
}

async function generateHmacSha256(msg, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(msg));
    return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, "0")).join("");
}
