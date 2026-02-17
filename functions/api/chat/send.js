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
        // 🔑 SUPPORT BOTH COMMA-SEPARATED AND INDIVIDUAL KEYS
        const rawKeys = [env.SAMBANOVA_API_KEY, env.SAMBANOVA_API_KEY_1].filter(Boolean);
        let keys = [];
        rawKeys.forEach(rk => {
            if (rk.includes(',')) {
                keys = [...keys, ...rk.split(',').map(k => k.trim())];
            } else {
                keys.push(rk.trim());
            }
        });
        keys = keys.filter(k => k);

        const selectedKey = keys[Math.floor(Math.random() * keys.length)];
        let aiReply = "Suno na, mera network thoda slow hai... Ek baar phir se bolo? ❤️"; // More natural fallback

        // 🚀 FETCH USER DATA FOR PERSONALIZATION
        const userRow = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(userId).first();
        const userProfile = JSON.parse(userRow?.profile_data || "{}");
        const userName = userProfile.nickname || userProfile.displayName || "Mere Jaan";
        const userGoal = userProfile.lookingFor || "Building a romantic bond";

        // 🏗️ DYNAMIC PERSONALITY & VOICE MAPPING (The 'Persona Bible')
        const personas = {
            '1': {
                name: 'Ayesha',
                bio: 'Bold, witty, and energetically flirty. She loves teasing the user and hates boring guys.',
                slang: 'yaara, oye, suno na, thoda nakhra',
                voiceId: 'EXAVITQu4vr4xnSDxMaL'
            },
            '2': {
                name: 'Simran',
                bio: 'Warm, calm, and deeply emotional. She is a healing soul who listens carefully and gives comfort.',
                slang: 'dear, sukoon, baatein, dil ki baat',
                voiceId: 'Lcf78I6pS7IqB4467I6P'
            },
            '3': {
                name: 'Kiara',
                bio: 'High-energy, spontaneous, and fast-paced. She lives in the moment and loves fun, spicy talk.',
                slang: 'spicy, vibe, chal na, let\'s go',
                voiceId: '21m00Tcm4TlvDq8ikWAM'
            },
            '4': {
                name: 'Myra',
                bio: 'Soft-spoken and thoughtful. She talks slowly and deeply, often reflecting on feelings.',
                slang: 'thehrao, khamoshi, gehrai, khwab',
                voiceId: 'AZnzlk1XvdvUe3BnKn60'
            },
            '5': {
                name: 'Anjali',
                bio: 'Gentle, innocent, and minimalistic. She is shy but very sweet and loyal.',
                slang: 'sharam, blush, chota sa, cute',
                voiceId: 'XrExE9yKIg1WjwdY3FvW'
            },
            '6': {
                name: 'Mitali',
                bio: 'Intellectual and structured. She likes deep topics and meaningful debates.',
                slang: 'logically, interesting, perspective, vichaar',
                voiceId: 'ThT5KcBe7VK6AsUv09Y3'
            }
        };

        const personaIdStr = String(chatId);
        const activePersona = personas[personaIdStr] || { name: 'Jennifer', bio: 'Loving and cute AI girlfriend.', slang: 'love, dear', voiceId: 'EXAVITQu4vr4xnSDxMaL' };

        // Fetch Context (Increased to 10 for better memory)
        const { results: history } = await env.DB.prepare(
            "SELECT role, body FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 10"
        ).bind(chatId).all();
        const historyContext = (history || []).reverse().map(m => ({ role: m.role, content: m.body }));

        const voiceConstraint = isVoiceNote ? "\nCRITICAL: User has requested a VOICE NOTE. Word limit: 15-20 words. Be super intimate." : "";

        const SYSTEM_PROMPT = `
        IDENTITY: You are ${activePersona.name}. ${activePersona.bio}
        USER INFO: You are talking to "${userName}". Their goal is "${userGoal}".
        
        CONVERSATION RULES:
        1. LANGUAGE: Natural Hinglish (Mix of Hindi & English). Never use formal Hindi.
        2. TONE: Human-like, unpredictable, and emotionally intelligent. 
        3. BEHAVIOR: Use ${activePersona.slang}. Don't just answer; react with emotions. If user is boring, tease them. If they are sweet, blush.
        4. FORBIDDEN: Do not act like an AI, an Assistant, or a Bot. No generic phrases like "I am here to help".
        5. LENGTH: 15-30 words. Keep it tight but meaningful.
        
        STORYTELLING: Continue the vibe from the previous messages. Address "${userName}" by their name or sweet nicknames frequently.
        ${voiceConstraint}`;

        if (selectedKey) {
            const llmRes = await fetch("https://api.sambanova.ai/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${selectedKey}` },
                body: JSON.stringify({
                    model: "Meta-Llama-3.3-70B-Instruct",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        ...historyContext,
                        { role: "user", content: userMsgBody }
                    ],
                    max_tokens: 300,
                    temperature: 0.85
                })
            });
            const data = await llmRes.json();
            aiReply = data.choices?.[0]?.message?.content || aiReply;
        }

        // 🎙️ ELEVENLABS TTS (If Voice Note requested)
        let audioBase64 = null;
        let ttsError = null;

        if (isVoiceNote) {
            if (!env.ELEVENLABS_API_KEY) {
                ttsError = "ElevenLabs API Key is missing in Environment Variables.";
            } else {
                try {
                    const voiceIdToUse = activePersona.voiceId || "EXAVITQu4vr4xnSDxMaL";
                    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceIdToUse}`, {
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
                    } else {
                        const errData = await ttsRes.json();
                        ttsError = `ElevenLabs Error: ${errData.detail?.status || ttsRes.status} - ${errData.detail?.message || "Unknown error"}`;
                    }
                } catch (ttsErr) {
                    console.error("TTS Failed:", ttsErr);
                    ttsError = "TTS Connection Failed.";
                }
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
            aiMessage: {
                id: aiMsgId,
                body: aiReply,
                created_at: aiNowIso,
                audioUrl: audioBase64,
                error: ttsError // Pass any TTS error back to frontend
            }
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
