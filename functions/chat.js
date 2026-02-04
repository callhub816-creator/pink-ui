export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Cloudflare Settings mein GEMINI_API_KEY nahi mili. Please add it." }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 1. Using v1beta for advanced features like system_instruction
        // 2. Using gemini-1.5-flash (Standard Stable ID)
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // 3. Ensuring history is in correct model/user format
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
                maxOutputTokens: 500,
                temperature: 0.9,
                topP: 0.8,
                topK: 40
            }
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({
                error: `Google API Error: ${data.error?.message || "Something went wrong"}`,
                details: data.error
            }), {
                status: response.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const candidate = data.candidates?.[0];

        if (candidate?.finishReason === "SAFETY") {
            return new Response(JSON.stringify({ text: "Suno... hum thodi der baad baat karein? Kuch thoughts block ho rahe hain. ❤️" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const responseText = candidate?.content?.parts?.[0]?.text || "I'm thinking... but words are not coming out.";

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
