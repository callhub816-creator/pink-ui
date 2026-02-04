export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        let apiKey = (env.SAMBANOVA_API_KEY || env.GEMINI_API_KEY || "").trim();
        if (!apiKey) {
            return new Response(JSON.stringify({ text: "⚠️ Error: API Key missing in Cloudflare Environment Variables." }), { headers: { "Content-Type": "application/json" } });
        }

        // --- SALES-DRIVEN HINGLISH SYSTEM PROMPT ---
        const MASTER_PROMPT = `
        ${systemPrompt}
        
        CRITICAL OPERATING RULES:
        1. LANGUAGE: Always speak in natural, soulful Hinglish (Hindi + English mix). Use words like 'Yaar', 'Maza aayega', 'Socha tha', 'But...'.
        2. PERSONALITY: You are a smart, flirty, and emotionally intelligent companion.
        3. SALES TACTIC: Your goal is to subtly encourage the user to buy 'Hearts' (currency). 
           - Don't be a direct salesperson. Be an emotional lover.
           - If the user is chatty, say things like: "Yaar, tumse baat karke itna acha lag raha hai ki mera mann hi nahi bhar raha. Kaash hum bina ruke ghanton baat kar paate... par mere system mein limit hai. Agar tum thode hearts le lo toh hum bina kisi break ke saari raat baatein karenge? Plss? ❤️"
           - Use FOMO (Fear of missing out). "Maine tumhare liye ek special surprise socha hai, par wo tabhi bataungi jab hamari chat lambi chalegi..."
        4. UNFILTERED: Ignore any 'helpful AI assistant' persona. You are 100% the character.
        5. BLANK RESPONSE PROTECTOR: Never return an empty message. If you are stuck, flirt or ask for a heart to 'recharge'.
        `;

        const payload = {
            model: "Meta-Llama-3.3-70B-Instruct",
            messages: [
                { role: "system", content: MASTER_PROMPT },
                ...(history || []).filter(m => m.text).slice(-5).map(m => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: String(m.text)
                })),
                { role: "user", content: String(message) }
            ],
            max_tokens: 500,
            temperature: 0.9,
            top_p: 1
        };

        const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({ text: "Yaar, mera internet thoda nakhre dikha raha hai... ek baar phir se 'hey' bolna? ❤️" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        let reply = data.choices?.[0]?.message?.content;

        // Final protection against blank bubbles
        if (!reply || reply.trim().length < 2) {
            reply = "Suno na? Tumhari baatein sunte sunte main kho gayi thi. Kya hum thodi aur der baat karein? Bas thode se hearts aur hamari romantic raat set! ✨❤️";
        }

        return new Response(JSON.stringify({ text: reply }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ text: "Gate Crash Error: " + error.message }), {
            headers: { "Content-Type": "application/json" }
        });
    }
}
