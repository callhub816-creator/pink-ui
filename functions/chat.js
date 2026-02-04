export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        // 1. Check for SambaNova API Key
        const apiKey = (env.SAMBANOVA_API_KEY || env.GEMINI_API_KEY || "").trim();

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "SambaNova API Key missing. Please add 'SAMBANOVA_API_KEY' in Cloudflare settings." }), { status: 401 });
        }

        // 2. Setup SambaNova Config
        const API_URL = "https://api.sambanova.ai/v1/chat/completions";
        // Fixed Model Name: Removed "-Turbo" as it's not standard for direct API
        const MODEL_ID = "Meta-Llama-3.1-70B-Instruct";

        // 3. Format Messages
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
            temperature: 0.7,
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
                error: `SambaNova Backend Error: ${data.error?.message || "Invalid Model or Key"}`,
                code: data.error?.code,
                status: response.status
            }), {
                status: 200, // Return 200 so UI can display the specific error message instead of a generic 404
                headers: { "Content-Type": "application/json" }
            });
        }

        const replyText = data.choices?.[0]?.message?.content || "I'm speachless right now...";

        return new Response(JSON.stringify({ text: replyText }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Cloudflare Gate Error: " + error.message }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
}
