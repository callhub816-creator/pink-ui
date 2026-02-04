export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        // 1. Get and Clean the key
        let apiKey = env.GEMINI_API_KEY || "";
        apiKey = apiKey.trim();

        if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
            return new Response(JSON.stringify({ error: "Cloudflare Settings mein 'GEMINI_API_KEY' set karke redeploy karein." }), { status: 500 });
        }

        // 2. Try v1beta as it's the most compatible for generative models
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // 3. Super Simple Payload (No advanced fields)
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `Persona: ${systemPrompt}\nUser: ${message}` }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.8
            }
        };

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            // Detailed Logging for you to see in the Console
            return new Response(JSON.stringify({
                error: `Google API Error: ${data.error?.message || "Check Key"}`,
                status: response.status,
                endpoint: "v1beta"
            }), { status: response.status });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response...";

        return new Response(JSON.stringify({ text: reply }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Function Crash: " + error.message }), { status: 500 });
    }
}
