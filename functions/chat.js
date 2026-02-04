export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        // 1. Key Sanitization
        let apiKey = (env.SAMBANOVA_API_KEY || env.GEMINI_API_KEY || "").trim();

        if (!apiKey) {
            return new Response(JSON.stringify({ text: "⚠️ Error: API Key missing in Cloudflare Environment Variables." }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. Format Body for SambaNova (OpenAI Compatible)
        const payload = {
            model: "Meta-Llama-3.1-70B-Instruct",
            messages: [
                { role: "system", content: systemPrompt || "You are a helpful AI assistant." },
                ...(history || []).map(m => ({
                    role: m.role === "user" ? "user" : "assistant",
                    content: String(m.text || m.content || "")
                })),
                { role: "user", content: String(message) }
            ],
            stream: false,
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

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({
                text: `⚠️ SambaNova Error ${response.status}: ${data.error?.message || "Internal failure"}`
            }), { headers: { "Content-Type": "application/json" } });
        }

        // 3. Robust Reply Extraction
        const replyText = data.choices?.[0]?.message?.content;

        if (!replyText || replyText.trim() === "") {
            return new Response(JSON.stringify({ text: "I'm thinking... but my thoughts are coming out blank. Can you say that again? ❤️" }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({ text: replyText }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ text: "⚠️ Gate Error: " + error.message }), {
            headers: { "Content-Type": "application/json" }
        });
    }
}
