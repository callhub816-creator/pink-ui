export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Cloudflare Settings mein GEMINI_API_KEY missing hai." }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 1. Using v1 (STABLE PRODUCTION ENDPOINT)
        // 2. Using gemini-1.5-flash which is standard
        const modelId = "gemini-1.5-flash";
        const API_URL = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;

        // 3. AGNOSTIC PROMPT STRATEGY: 
        // We inject the system instruction as the VERY FIRST user message 
        // to avoid "Unknown name system_instruction" errors on different API versions.
        const systemMessage = {
            role: "user",
            parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}\n\nUnderstood. I will now stay in character as your companion.` }]
        };

        const assistantAcknowledgement = {
            role: "model",
            parts: [{ text: "Theek hai, main samajh gayi. Let's talk! ❤️" }]
        };

        const formattedHistory = (history || []).map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: String(m.text || "") }]
        }));

        // Combine: System Logic + Previous Chat + Current Message
        const finalContents = [
            systemMessage,
            assistantAcknowledgement,
            ...formattedHistory,
            { role: "user", parts: [{ text: String(message) }] }
        ];

        const payload = {
            contents: finalContents,
            generationConfig: {
                maxOutputTokens: 500,
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
            return new Response(JSON.stringify({
                error: `Google API Error: ${data.error?.message || "Something went wrong"}`,
                details: data.error
            }), {
                status: response.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const candidate = data.candidates?.[0];
        const responseText = candidate?.content?.parts?.[0]?.text || "I'm thinking... but can't find the words.";

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
