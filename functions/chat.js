export async function onRequestPost({ request, env }) {
    try {
        const { message, systemPrompt, history } = await request.json();

        let apiKey = (env.SAMBANOVA_API_KEY || env.GEMINI_API_KEY || "").trim();
        if (!apiKey) {
            return new Response(JSON.stringify({ text: "⚠️ SambaNova API Key is missing. Please add it to Cloudflare." }), { headers: { "Content-Type": "application/json" } });
        }

        // --- BULLETPROOF SAMBANOVA MODELS ---
        // We will try these in order until one works.
        const modelsToTry = [
            "Meta-Llama-3.3-70B-Instruct", // Latest Stable
            "Meta-Llama-3.1-70B-Instruct", // Standard Stable
            "Meta-Llama-3.1-8B-Instruct"   // Lightweight Backup
        ];

        let lastError = "";

        for (const modelId of modelsToTry) {
            try {
                const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            { role: "system", content: systemPrompt || "You are a helpful companion." },
                            ...(history || []).map(m => ({
                                role: m.role === "user" ? "user" : "assistant",
                                content: String(m.text || m.content || "")
                            })),
                            { role: "user", content: String(message) }
                        ],
                        max_tokens: 512,
                        temperature: 0.8
                    })
                });

                const rawResponse = await response.clone().text();

                if (response.ok) {
                    const data = JSON.parse(rawResponse);
                    const reply = data.choices?.[0]?.message?.content;
                    if (reply) {
                        return new Response(JSON.stringify({ text: reply }), {
                            headers: { "Content-Type": "application/json" }
                        });
                    }
                } else {
                    lastError = `Model ${modelId} failed: ${rawResponse.substring(0, 100)}`;
                    // If it's a 404/400 model error, try the next one in the loop
                    if (response.status === 404 || response.status === 400) continue;
                    else break; // Authentication or other serious errors
                }
            } catch (e) {
                lastError = e.message;
            }
        }

        return new Response(JSON.stringify({
            text: `⚠️ All SambaNova models failed. Last Error: ${lastError.substring(0, 150)}...`
        }), { headers: { "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify({ text: "⚠️ Cloudflare Crash: " + error.message }), {
            headers: { "Content-Type": "application/json" }
        });
    }
}
