export async function onRequestPost({ request, env }) {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            amount,
            type,
            context
        } = await request.json();

        if (!razorpay_payment_id || !razorpay_signature) {
            return new Response(
                JSON.stringify({ error: "Missing payment_id or signature" }),
                { status: 400 }
            );
        }

        const secret = env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return new Response(
                JSON.stringify({ error: "Server misconfigured: missing Razorpay secret" }),
                { status: 500 }
            );
        }

        const payload = razorpay_order_id
            ? `${razorpay_order_id}|${razorpay_payment_id}`
            : razorpay_payment_id;

        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBuffer = await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode(payload)
        );

        const generatedSignature = [...new Uint8Array(signatureBuffer)]
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");

        if (generatedSignature !== razorpay_signature) {
            return new Response(
                JSON.stringify({ error: "Invalid signature" }),
                { status: 401 }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Payment verified",
                data: { amount, type, context }
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: "Verification failed", detail: err.message }),
            { status: 500 }
        );
    }
}
