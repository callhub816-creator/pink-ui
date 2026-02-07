
export async function onRequestGet({ request, env }) {
    const cookieHeader = request.headers.get("Cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
    const token = cookies["auth_token"];

    const debugInfo = {
        hasCookieHeader: !!cookieHeader,
        cookieCount: cookieHeader.split(";").length,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        envDbBound: !!env.DB,
        envJwtSecretBound: !!env.JWT_SECRET
    };

    if (token) {
        try {
            const parts = token.split(".");
            debugInfo.tokenParts = parts.length;
            if (parts.length === 2) {
                const payloadStr = atob(parts[0]);
                debugInfo.payload = JSON.parse(payloadStr);
                debugInfo.tokenFormat = "Old (Base64)";
            }
        } catch (e) {
            debugInfo.decodeError = e.message;
        }
    }

    return new Response(JSON.stringify(debugInfo, null, 2), {
        headers: { "Content-Type": "application/json" }
    });
}
