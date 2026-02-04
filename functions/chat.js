export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        // 1. Get and CLEAN the API key
        let apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Environment Variable 'GEMINI_API_KEY' nahi mila." }), { status: 500 });
        }
        apiKey = apiKey.trim(); // Remove any hidden spaces

        // 2. Using STABLE v1 and FLASH model (Most supported)
        const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // 3. AGNOSTIC PAYLOAD (Works on every version)
        // We put instructions inside the conversation itself
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `Instruction: Be a female AI companion. Style: Hinglish. Tone: Warm. My Persona: ${systemPrompt}\n\nUnderstood?` }]
                },
                {
                    role: "model",
                    parts: [{ text: "Haan, main samajh gayi. Let's chat! ❤️" }]
                },
                ...(history || []).map(m => ({
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: String(m.text || "") }]
                })),
                {
                    role: "user",
                    parts: [{ text: String(message) }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.9
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
                error: `Google Error: ${data.error?.message || "Check API Key"}`,
                status: response.status
            }), { status: response.status });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm a bit lost for words...";

        return new Response(JSON.stringify({ text: reply }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "System Crash: " + error.message }), { status: 500 });
    }
}
