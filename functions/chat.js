export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history, userMode } = await request.json();

        // 1. Get API Key from Environment
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing in Cloudflare Pages Settings." }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 2. Select Model based on Tier (Gemini 1.5 is standard now)
        const modelId = userMode === "PREMIUM" ? "gemini-1.5-pro" : "gemini-1.5-flash";

        // 3. Construct v1beta Endpoint (Supports system_instruction)
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

        // 4. Format History properly for Gemini
        const formattedHistory = (history || []).map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text || "" }]
        }));

        // 5. Construct Payload
        const payload = {
            contents: [...formattedHistory, { role: "user", parts: [{ text: message }] }],
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                maxOutputTokens: userMode === "PREMIUM" ? 800 : 250,
                temperature: 0.9,
                topP: 0.8,
                topK: 40
            },
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
                error: data.error?.message || "Gemini Brain Error",
                details: data.error
            }), {
                status: response.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const candidate = data.candidates?.[0];

        // Handle finish reasons (Safety/Other)
        if (candidate?.finishReason === "SAFETY") {
            return new Response(JSON.stringify({ text: "I'm blushing... maybe we should talk about something else? ❤️" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const responseText = candidate?.content?.parts?.[0]?.text || "I'm a bit lost for words right now...";

        return new Response(JSON.stringify({
            text: responseText
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Gate Error: " + error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
