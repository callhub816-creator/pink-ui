export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        // 1. Check for SambaNova API Key
        // Priority: SAMBANOVA_API_KEY if exists, otherwise fallback to GEMINI_API_KEY (if user reused the same name)
        const apiKey = (env.SAMBANOVA_API_KEY || env.GEMINI_API_KEY || "").trim();

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "SambaNova API Key missing. Please add 'SAMBANOVA_API_KEY' in Cloudflare settings." }), { status: 401 });
        }

        // 2. Setup SambaNova Config
        const API_URL = "https://api.sambanova.ai/v1/chat/completions";
        const MODEL_ID = "Meta-Llama-3.1-70B-Instruct-Turbo"; // High performance model

        // 3. Format Messages for OpenAI compatibility
        const messages = [
            { role: "system", content: systemPrompt },
            ...(history || []).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: String(m.text || "")
            })),
            { role: "user", content: String(message) }
        ];

        const payload = {
            model: MODEL_ID,
            messages: messages,
            max_tokens: 800,
            temperature: 0.8,
            top_p: 0.9
        };

        // 4. Send Request 
        const response = await fetch(API_URL, {
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
                error: `SambaNova Error: ${data.error?.message || "API Failure"}`,
                status: response.status
            }), { status: response.status });
        }

        // 5. Extract Reply
        const replyText = data.choices?.[0]?.message?.content || "I'm speachless right now...";

        return new Response(JSON.stringify({ text: replyText }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Backend Crash: " + error.message }), { status: 500 });
    }
}
