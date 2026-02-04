export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();
        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing in Cloudflare settings." }), { status: 500 });
        }

        // --- BULLETPROOF MODEL LIST ---
        // We will try Flash first, then fallback to Pro if Flash is not found in your region/key.
        const modelsToTry = ["gemini-1.5-flash", "gemini-pro"];
        let lastError = "";

        for (const modelId of modelsToTry) {
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

            const payload = {
                contents: [
                    { role: "user", parts: [{ text: `SYSTEM: ${systemPrompt}` }] },
                    { role: "model", parts: [{ text: "Understood. I'm ready." }] },
                    ...(history || []).map(m => ({
                        role: m.role === "user" ? "user" : "model",
                        parts: [{ text: String(m.text || "") }]
                    })),
                    { role: "user", parts: [{ text: String(message) }] }
                ],
                generationConfig: { maxOutputTokens: 500, temperature: 0.9 }
            };

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const data = await response.json();

                if (response.ok) {
                    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (reply) {
                        return new Response(JSON.stringify({ text: reply }), {
                            headers: { "Content-Type": "application/json" },
                        });
                    }
                } else {
                    // Store error and try next model if it's a 404 (Not Found)
                    lastError = data.error?.message || "API Error";
                    if (response.status !== 404) break; // If it's not a 404, it's a real error (like key issue), so don't retry.
                }
            } catch (e) {
                lastError = e.message;
            }
        }

        return new Response(JSON.stringify({
            error: `All models failed. Last Error: ${lastError}`,
            hint: "Check if your API Key is valid and Generative Language API is enabled in Google AI Studio."
        }), { status: 500, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify({ error: "Gate Crash: " + error.message }), { status: 500 });
    }
}
