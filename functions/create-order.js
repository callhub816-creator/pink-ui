export async function onRequestPost({ env }) {
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    const auth = btoa(`${keyId}:${keySecret}`);

    const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount: 9900,
            currency: "INR",
            payment_capture: 1
        })
    });

    const order = await res.json();

    return new Response(JSON.stringify(order), {
        headers: { "Content-Type": "application/json" }
    });
}
