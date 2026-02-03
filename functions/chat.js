export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history, userMode } = await request.json();

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Gemini API key is missing. Please set GEMINI_API_KEY in Cloudflare environment variables." }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Use stable 1.5 models
        const modelId = userMode === "PREMIUM" ? "gemini-1.5-pro" : "gemini-1.5-flash";

        // Switch to stable v1 API
        const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;

        const formattedHistory = (history || []).map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.parts?.[0]?.text || m.text || "" }]
        }));

        const payload = {
            contents: [...formattedHistory, { role: "user", parts: [{ text: message }] }],
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                maxOutputTokens: userMode === "PREMIUM" ? 800 : 200,
                temperature: 0.9,
                topP: 0.8,
                topK: 40
            },
            // Reduce safety filters to allow "Bold" persona talk without blocking
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({
                error: data.error?.message || "Gemini API connection error",
                code: data.error?.code,
                status: response.status
            }), {
                status: response.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const candidate = data.candidates?.[0];

        // Handle blocked content
        if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "OTHER") {
            return new Response(JSON.stringify({
                error: "My thoughts were blocked by safety filters. Let's talk about something else? ❤️",
                reason: candidate.finishReason
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (!candidate || !candidate.content) {
            return new Response(JSON.stringify({ error: "No response from AI brain." }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        const responseText = candidate.content.parts?.[0]?.text || "I'm a bit lost for words right now...";

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
