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

    try {
        // 2. 🛡️ INPUT VALIDATION (Strict)
        const bodyText = await request.text();
        if (!bodyText) return new Response(JSON.stringify({ error: "Empty body" }), { status: 400 });
        const { message, chatId, isVoiceNote } = JSON.parse(bodyText);

        // a. Strict Type Check
        if (typeof message !== 'string') return new Response(JSON.stringify({ error: "Invalid message type" }), { status: 400 });
        const userMsgBody = message.trim();

        // 3. 🚀 ATOMIC UPDATE (Deduct Hearts + Rate Limit)
        const heartsToDeduct = isVoiceNote ? 3 : 1;
        const nowMs = Date.now();
        const rateLimitThreshold = nowMs - 1500;
        const nowIso = new Date(nowMs).toISOString();

        // 🛡️ STRICT CONSISTENCY UPDATE
        const batchResult = await env.DB.batch([
            env.DB.prepare(`
                UPDATE users 
                SET profile_data = json_set(profile_data, 
                    '$.hearts', CAST(json_extract(profile_data, '$.hearts') AS INTEGER) - ?,
                    '$.last_message_ts', ? 
                )
                WHERE id = ? 
                AND CAST(json_extract(profile_data, '$.hearts') AS INTEGER) >= ?
                AND (
                    json_extract(profile_data, '$.last_message_ts') IS NULL 
                    OR CAST(json_extract(profile_data, '$.last_message_ts') AS INTEGER) < ?
                )
            `).bind(heartsToDeduct, nowMs, userId, heartsToDeduct, rateLimitThreshold),
            env.DB.prepare("INSERT INTO messages (id, chat_id, sender_id, body, created_at, role) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), chatId, userId, userMsgBody, nowIso, 'user')
        ]);

        if (batchResult[0].meta.changes === 0) {
            return new Response(JSON.stringify({ error: "Insufficient hearts or too fast! ❤️", action: "open_shop" }), { status: 429 });
        }

        // 🏗️ LLM EXECUTION
        const keys = [env.SAMBANOVA_API_KEY, env.SAMBANOVA_API_KEY_1].filter(k => k);
        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        let aiReply = "Hmm... I'm listening... ❤️";

        // Fetch Context
        const { results: history } = await env.DB.prepare(
            "SELECT role, body FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 6"
        ).bind(chatId).all();
        const historyContext = (history || []).reverse().map(m => ({ role: m.role, content: m.body }));

        const voiceConstraint = isVoiceNote ? "\nCRITICAL: User has requested a VOICE NOTE. Your response MUST BE UNDER 15 WORDS and very natural/intimate." : "";
        const SYSTEM_PROMPT = `You are Jennifer, a loving and cute AI Girlfriend. 
        STYLE: Hinglish (mix of Hindi & English). 
        STRICT RULE: Keep your replies ULTRA-SHORT (max 10-15 words). Talk like a real person on WhatsApp—concise, sweet, and informal. No long paragraphs ever.${voiceConstraint}`;

        if (selectedKey) {
            const llmRes = await fetch("https://api.sambanova.ai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${selectedKey}` },
                body: JSON.stringify({
                    model: "Meta-Llama-3.3-70B-Instruct",
                    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...historyContext, { role: "user", content: userMsgBody }],
                    max_tokens: 150,
                    temperature: 0.8
                })
            });
            const data = await llmRes.json();
            aiReply = data.choices?.[0]?.message?.content || aiReply;
        }

        // 🎙️ ELEVENLABS TTS (If Voice Note requested)
        let audioBase64 = null;
        if (isVoiceNote && env.ELEVENLABS_API_KEY) {
            try {
                const voiceId = env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL"; // Default sweet voice
                const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                    method: "POST",
                    headers: {
                        "xi-api-key": env.ELEVENLABS_API_KEY,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        text: aiReply,
                        model_id: "eleven_multilingual_v2",
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                    })
                });
                if (ttsRes.ok) {
                    const audioBuffer = await ttsRes.arrayBuffer();
                    const uint8 = new Uint8Array(audioBuffer);
                    let binary = "";
                    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
                    audioBase64 = `data:audio/mpeg;base64,${btoa(binary)}`;
                }
            } catch (ttsErr) {
                console.error("TTS Failed:", ttsErr);
            }
        }

        // Save AI Msg
        const aiMsgId = crypto.randomUUID();
        const aiNowIso = new Date().toISOString();
        const metadata = audioBase64 ? JSON.stringify({ audioUrl: audioBase64 }) : null;

        await env.DB.prepare("INSERT INTO messages (id, chat_id, sender_id, body, created_at, role, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(aiMsgId, chatId, 'ai_assistant', aiReply, aiNowIso, 'assistant', metadata).run();

        return new Response(JSON.stringify({
            success: true,
            aiMessage: { id: aiMsgId, body: aiReply, created_at: aiNowIso, audioUrl: audioBase64 }
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
