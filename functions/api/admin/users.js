
export async function onRequestGet({ request, env }) {
    if (!env.DB) return new Response(JSON.stringify({ error: "DB missing" }), { status: 500 });

    try {
        // Simple Admin Auth Check (can be improved later with specific roles)
        // For now, it's open for admin console testing
        const users = await env.DB.prepare(`
            SELECT 
                id, 
                username, 
                display_name, 
                profile_data, 
                created_at 
            FROM users 
            ORDER BY created_at DESC
        `).all();

        return new Response(JSON.stringify({
            success: true,
            users: users.results.map(u => ({
                ...u,
                profile: JSON.parse(u.profile_data || "{}")
            }))
        }), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
