export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const amount = body.amount;

        const keyId = env.RAZORPAY_KEY_ID;
        const keySecret = env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return new Response(JSON.stringify({
                error: "Razorpay credentials missing",
                detail: "Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in Cloudflare Environment Variables"
            }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        const auth = btoa(`${keyId}:${keySecret}`);

        const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount || 9900,
                currency: "INR",
                payment_capture: 1
            })
        });

        const orderData = await razorpayRes.json();

        if (!razorpayRes.ok) {
            return new Response(JSON.stringify({
                error: "Razorpay API Error",
                detail: orderData
            }), { status: razorpayRes.status, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify(orderData), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({
            error: "Order creation failed",
            detail: err.message
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
