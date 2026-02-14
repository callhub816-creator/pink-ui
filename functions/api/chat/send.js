export async function onRequestPost({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });
    const startTime = Date.now();

    // 1. 🔒 AUTH CHECK (Hardened)
    const cookieHeader = request.headers.get("Cookie") || "";
    const authHeader = request.headers.get("Authorization") || "";

    let token = null;
    if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
        token = cookies["auth_token"];
    }

    if (!token) return new Response(JSON.stringify({ error: "Unauthorized (Missing Token)" }), { status: 401 });

    let userId;
    try {
        const parts = token.split(".");
        // Handle both custom 2-part and standard 3-part (standard: header.payload.signature)
        // If 3 parts, payload is index 1. If 2 parts, payload is index 0.
        const isStandardJWT = parts.length === 3;
        const payloadB64 = isStandardJWT ? parts[1] : parts[0];
        const signatureB64 = isStandardJWT ? parts[2] : parts[1];

        if (!payloadB64 || !signatureB64) throw new Error("Malformatted token parts");

        const decoder = new TextDecoder();
        const payloadUint8 = new Uint8Array(atob(payloadB64).split("").map(c => c.charCodeAt(0)));
        const payloadStr = decoder.decode(payloadUint8);
        const payload = JSON.parse(payloadStr);

        // Check expiration
        if (payload.exp < Date.now()) {
            return new Response(JSON.stringify({ error: "Session expired", expiredAt: payload.exp, now: Date.now() }), { status: 401 });
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
            return new Response(JSON.stringify({ error: "Invalid session (Signature Match Failed)" }), { status: 401 });
        }

        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ error: "Auth verification failed", details: e.message }), { status: 401 });
    }

    // 2. 🛡️ INPUT VALIDATION (Strict)
    try {
        const bodyText = await request.text();
        if (!bodyText) return new Response(JSON.stringify({ error: "Empty body" }), { status: 400 });
        const { message, chatId } = JSON.parse(bodyText);

        // a. Strict Type Check
        if (typeof message !== 'string') return new Response(JSON.stringify({ error: "Invalid message type" }), { status: 400 });
        if (typeof chatId !== 'string') return new Response(JSON.stringify({ error: "Invalid chatId type" }), { status: 400 });

        // b. Chat ID Validation
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(chatId)) {
            return new Response(JSON.stringify({ error: "Invalid Chat ID format" }), { status: 400 });
        }

        // c. Message Sanitization
        const userMsgBody = message.trim();
        if (!userMsgBody) return new Response(JSON.stringify({ error: "Empty message" }), { status: 400 });
        if (userMsgBody.length > 500) return new Response(JSON.stringify({ error: "Message too long" }), { status: 400 });

        // 3. 🛑 ATOMIC PRE-CHECKS (Read Only)
        // We fetch profile to check Hearts > 0 visually, but limit enforcement happens in UPDATE.
        const { results: userRes } = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(userId).all();
        if (!userRes?.length) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
        const profile = JSON.parse(userRes[0].profile_data || "{}");

        // 4. 🚀 ATOMIC UPDATE (Deduct Heart + Rate Limit + Streak)
        // LOGIC: Update ONLY IF:
        // 1. Hearts > 0
        // 2. Last Message Time < (Now - 1500ms)

        const nowMs = Date.now();
        const rateLimitThreshold = nowMs - 1500;
        const nowIso = new Date(nowMs).toISOString();
        const streakDate = nowIso.split('T')[0];

        // Streak Calculation (JS side for logic, but stored atomically)
        const lastDate = profile.last_chat_date || "";
        let streak = parseInt(profile.streak || 0);
        if (lastDate !== streakDate) {
            const yesterday = new Date(nowMs - 86400000).toISOString().split('T')[0];
            if (lastDate === yesterday) streak += 1; else streak = 1;
        }

        const userMsgId = crypto.randomUUID();

        // 🛡️ STRICT CONSISTENCY UPDATE + CLOCK SKEW PROTECTION
        const batchResult = await env.DB.batch([
            env.DB.prepare(`
                UPDATE users 
                SET profile_data = json_set(profile_data, 
                    '$.hearts', CAST(json_extract(profile_data, '$.hearts') AS INTEGER) - 1,
                    '$.streak', ?,
                    '$.last_chat_date', ?,
                    '$.last_message_ts', ? 
                )
                WHERE id = ? 
                AND CAST(json_extract(profile_data, '$.hearts') AS INTEGER) > 0
                AND (
                    json_extract(profile_data, '$.last_message_ts') IS NULL 
                    OR CAST(json_extract(profile_data, '$.last_message_ts') AS INTEGER) < ?
                    OR CAST(json_extract(profile_data, '$.last_message_ts') AS INTEGER) > ?
                )
            `).bind(streak, streakDate, nowMs, userId, rateLimitThreshold, nowMs + 60000), // Reset if ts > Now + 1min
            env.DB.prepare("INSERT INTO messages (id, chat_id, sender_id, body, created_at, role) VALUES (?, ?, ?, ?, ?, ?)").bind(userMsgId, chatId, userId, userMsgBody, nowIso, 'user')
        ]);

        // 🛡️ AFFECTED ROWS CHECK
        const updateMeta = batchResult[0].meta;
        if (updateMeta && updateMeta.changes === 0) {
            // Determine Failure Reason (Race or Hearts or Rate Limit)
            // We can do a quick check to see WHICH failed, or just return generic "Action Failed".
            // For strict logging:
            await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'atomic_update_failed', JSON.stringify({ reason: "Rate Limit or Zero Hearts" }), nowIso).run();
            return new Response(JSON.stringify({ error: "Too fast or No hearts! ❤️" }), { status: 429 });
        }

        // 🏗️ LLM EXECUTION
        const keys = [env.SAMBANOVA_API_KEY, env.SAMBANOVA_API_KEY_1, env.SAMBANOVA_API_KEY_2].filter(k => k);
        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        let aiReply = "Hmm... I'm listening... ❤️";
        let modelUsed = "none";

        try {
            // Fetch Context
            const { results: history } = await env.DB.prepare(
                "SELECT role, body FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 10"
            ).bind(chatId).all();
            const historyContext = (history || []).reverse().map(m => ({ role: m.role, content: m.body }));

            const userName = profile.displayName || "User";
            const relationship = profile.relationship_level || "crush";
            const SYSTEM_PROMPT = `You are a loving AI Girlfriend. Name: Jennifer. User: ${userName}. Streak: ${streak}. Style: Hinglish. Short.`;

            if (selectedKey) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 45000);

                const llmRes = await fetch("https://api.sambanova.ai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${selectedKey}` },
                    body: JSON.stringify({
                        model: "Meta-Llama-3.3-70B-Instruct",
                        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...historyContext, { role: "user", content: userMsgBody }],
                        max_tokens: 300,
                        temperature: 0.8
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!llmRes.ok) throw new Error(`LLM API Error: ${llmRes.status}`);
                const data = await llmRes.json();
                aiReply = data.choices?.[0]?.message?.content || aiReply;
                modelUsed = data.model;
            }

            // Save AI Msg
            const aiMsgId = crypto.randomUUID();
            const aiNowIso = new Date().toISOString();
            const latency = Date.now() - startTime;

            await env.DB.batch([
                env.DB.prepare("INSERT INTO messages (id, chat_id, sender_id, body, created_at, role) VALUES (?, ?, ?, ?, ?, ?)").bind(aiMsgId, chatId, 'ai_assistant', aiReply, aiNowIso, 'assistant'),
                env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'chat_turn', JSON.stringify({ latency, model: modelUsed }), aiNowIso)
            ]);

            return new Response(JSON.stringify({
                success: true,
                userMessage: { id: userMsgId, body: userMsgBody, sender_id: userId, created_at: nowIso },
                aiMessage: { id: aiMsgId, body: aiReply, sender_id: 'ai_assistant', created_at: aiNowIso },
                heartsRemaining: parseInt(profile.hearts || 1) - 1, // Estimate
                streak
            }), { headers: { "Content-Type": "application/json" } });

        } catch (llmError) {
            console.error("LLM Error:", llmError);

            // 🔄 REFUND SAFETY HARDENING
            const refundRes = await env.DB.prepare(`
                UPDATE users 
                SET profile_data = json_set(profile_data, '$.hearts', CAST(json_extract(profile_data, '$.hearts') AS INTEGER) + 1)
                WHERE id = ?
            `).bind(userId).run();

            if (refundRes.meta.changes === 0) {
                // 🚨 CRITICAL LOG: Refund Failed! Matches user ID issue?
                await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'refund_failed_critical', JSON.stringify({ error: "Refund Rows 0" }), new Date().toISOString()).run();
            } else {
                await env.DB.prepare("INSERT INTO logs (id, user_id, action, details, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, 'llm_fail_refund_success', JSON.stringify({ error: llmError.message }), new Date().toISOString()).run();
            }

            return new Response(JSON.stringify({ error: "AI is sleeping... Heart refunded! ❤️" }), { status: 500 });
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
