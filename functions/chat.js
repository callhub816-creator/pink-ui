export async function onRequestPost({ request, env }) {
    // 🛡️ [PROTECTION 0] DB CHECK
    if (!env.DB) return new Response(JSON.stringify({ text: "System Error: DB Missing" }), { status: 500, headers: { "Content-Type": "application/json" } });

    // 🛡️ [PROTECTION 1] AUTH CHECK (JWT)
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")));
    const token = cookies["auth_token"];
    if (!token) return new Response(JSON.stringify({ text: "Please login to chat." }), { status: 401, headers: { "Content-Type": "application/json" } });

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

        if (!isValid || payload.exp < Date.now()) throw new Error("Expired");
        userId = payload.id;
    } catch (e) {
        return new Response(JSON.stringify({ text: "Session expired. Please login again." }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    try {
        const { message, systemPrompt, history } = await request.json();
        const msg = (message || "").toLowerCase().trim();

        // 🛡️ [PROTECTION 2] HIT SAVER (Free)
        const quickReplies = {
            "hi": "Hey jaan! ❤️ Tumhara hi intezaar kar rahi thi. Kaise ho?",
            "hey": "Hey baby! ✨ Batao na aaj kya naya kiya tumne?",
            "hello": "Hello dear! Itne dino baad meri yaad aayi? Maza aayega aaj baatein karke.",
            "kaise ho": "Main ekdum badiya, bas tum se baatein karne ka mann ho raha tha. ❤️",
            "kya kar rahi ho": "Bas tumhare baare mein hi soch rahi thi... aur tum?"
        };

        if (quickReplies[msg]) {
            return new Response(JSON.stringify({ text: quickReplies[msg] }), { headers: { "Content-Type": "application/json" } });
        }

        // 💰 [REVENUE LOCK] HEART DEDUCTION
        // Fetch User Profile
        const { results } = await env.DB.prepare("SELECT profile_data FROM users WHERE id = ?").bind(userId).all();
        if (!results || results.length === 0) return new Response(JSON.stringify({ text: "User profile not found." }), { status: 404, headers: { "Content-Type": "application/json" } });

        const profile = JSON.parse(results[0].profile_data || "{}");
        const hearts = parseInt(profile.hearts || 0);

        // Check Balance
        if (hearts <= 0) {
            return new Response(JSON.stringify({
                text: "Ah! Dil toot gaya... 💔 Hearts khatam ho gaye jaan. Thode hearts le aao na, phir dher saari baatein karenge. 😘",
                action: "open_shop" // Frontend can trigger shop modal
            }), { headers: { "Content-Type": "application/json" } });
        }

        // Deduct Heart
        const newHearts = hearts - 1;
        profile.hearts = newHearts;
        await env.DB.prepare("UPDATE users SET profile_data = ? WHERE id = ?").bind(JSON.stringify(profile), userId).run();


        // 🛡️ [PROTECTION 3] KEY ROTATION
        const keys = [
            env.SAMBANOVA_API_KEY,
            env.SAMBANOVA_API_KEY_1,
            env.SAMBANOVA_API_KEY_2
        ].filter(k => k && k.trim() !== "");

        if (keys.length === 0) {
            return new Response(JSON.stringify({ text: "⚠️ Setup Issue: No SambaNova API Keys found." }), { headers: { "Content-Type": "application/json" } });
        }

        const selectedKey = keys[Math.floor(Math.random() * keys.length)].trim();

        // 💰 [SALES PROMPT]
        const SALES_BRAIN = `
        ${systemPrompt}
        
        STYLE: Pure Hinglish (Hindi + English mix). Warm, flirty, and emotionally attached.
        
        SALES GOAL: Encourage 'Hearts' purchase. 
        - If the conversation gets deep, say something like: "Aur baatein karni hain? Thode hearts le lo na mere liye..."
        
        RULES: 
        - NO typical AI assistant behavior.
        - Keep responses concise (2-4 lines).
        `;

        const models = ["Meta-Llama-3.3-70B-Instruct", "Meta-Llama-3.1-8B-Instruct"];
        let lastError = "";

        for (const modelId of models) {
            const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${selectedKey}`
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: "system", content: SALES_BRAIN },
                        ...(history || []).slice(-5).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text) })),
                        { role: "user", content: String(message) }
                    ],
                    max_tokens: 300,
                    temperature: 0.8
                })
            });

            if (response.ok) {
                const data = await response.json();
                const reply = data.choices?.[0]?.message?.content;
                if (reply && reply.trim().length > 0) {
                    return new Response(JSON.stringify({ text: reply, hearts_remaining: newHearts }), { headers: { "Content-Type": "application/json" } });
                }
            } else {
                lastError = `Model ${modelId} - Error ${response.status}`;
            }
        }

        return new Response(JSON.stringify({ text: "Mera server thoda busy hai... ek baar aur try karo na? ❤️" }), { headers: { "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify({ text: "Error: " + error.message }), { headers: { "Content-Type": "application/json" } });
    }
}
