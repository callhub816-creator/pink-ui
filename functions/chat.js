export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history, userMode } = await request.json();

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "API Key is missing in Cloudflare. Please set GEMINI_API_KEY." }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Use Stable gemini-1.5-flash for everyone to ensure it works first
        // gemini-1.5-flash is now GA (Generally Available) on v1
        const modelId = "gemini-1.5-flash";

        // SWITCHED TO v1 (Stable Endpoint)
        const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;

        const formattedHistory = (history || []).map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: String(m.text || "") }]
        }));

        const payload = {
            contents: [...formattedHistory, { role: "user", parts: [{ text: String(message) }] }],
            system_instruction: {
                parts: [{ text: String(systemPrompt) }]
            },
            generationConfig: {
                maxOutputTokens: 400,
                temperature: 0.9,
            }
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            // Detailed error reporting
            return new Response(JSON.stringify({
                error: `Google API Error: ${data.error?.message || "Unknown"}`,
                code: data.error?.code,
                details: data.error
            }), {
                status: response.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const candidate = data.candidates?.[0];

        if (candidate?.finishReason === "SAFETY") {
            return new Response(JSON.stringify({ text: "I'm feeling a bit shy about that... let's talk about something else? ❤️" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const responseText = candidate?.content?.parts?.[0]?.text || "I'm a bit lost for words...";

        return new Response(JSON.stringify({
            text: responseText
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Backend Crash: " + error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
