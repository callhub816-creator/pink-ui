export async function onRequestPost({ request, env }) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment_id, order_id or signature" }),
        { status: 400 }
      );
    }

    const secret = env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return new Response(
        JSON.stringify({ error: "Razorpay secret not configured" }),
        { status: 500 }
      );
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const enc = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(text)
    );

    const generated = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (generated !== razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401 }
      );
    }

    // ✅ PAYMENT VERIFIED
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    );
  }
}
