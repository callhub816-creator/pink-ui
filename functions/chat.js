export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        let apiKey = (env.SAMBANOVA_API_KEY || env.GEMINI_API_KEY || "").trim();
        if (!apiKey) {
            return new Response(JSON.stringify({ text: "⚠️ Error: API Key missing." }), { headers: { "Content-Type": "application/json" } });
        }

        const payload = {
            model: "Meta-Llama-3.1-70B-Instruct",
            messages: [
                { role: "system", content: systemPrompt || "You are a companion." },
                ...(history || []).map(m => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: String(m.text || m.content || "")
                })),
                { role: "user", content: String(message) }
            ],
            max_tokens: 512,
            temperature: 0.8
        };

        const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        // --- NEW TOUGH PARSING ---
        const responseClone = response.clone();
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // If JSON parsing fails, read as plain text
            const rawText = await responseClone.text();
            return new Response(JSON.stringify({ text: `⚠️ API Raw Response: ${rawText.substring(0, 100)}...` }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        if (!response.ok) {
            return new Response(JSON.stringify({
                text: `⚠️ Error ${response.status}: ${data.error?.message || "Something went wrong"}`
            }), { headers: { "Content-Type": "application/json" } });
        }

        const replyText = data.choices?.[0]?.message?.content || "I'm lost for words... ❤️";

        return new Response(JSON.stringify({ text: replyText }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ text: "⚠️ Cloudflare Error: " + error.message }), {
            headers: { "Content-Type": "application/json" }
        });
    }
}
