export async function onRequestPost({ request, env }) {
    try {
        const { amount } = await request.json();
        const keyId = env.RAZORPAY_KEY_ID;
        const keySecret = env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            return new Response(JSON.stringify({ error: "Razorpay credentials missing in environment" }), { status: 500 });
        }

        const auth = btoa(`${keyId}:${keySecret}`);

        const res = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount || 9900, // Dynamic amount from frontend
                currency: "INR",
                payment_capture: 1
            })
        });

        const order = await res.json();

        return new Response(JSON.stringify(order), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
