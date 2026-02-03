
export const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export const initiatePayment = async (options: {
    amount: number;
    currency: string;
    name: string;
    description: string;
    userEmail: string;
    userPhone?: string;
    onSuccess: (response: any) => void;
    onFailure: (error: any) => void;
}) => {
    const isLoaded = await loadRazorpay();

    if (!isLoaded) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
    }

    // 1. Create Order via Backend
    let order;
    try {
        const orderRes = await fetch('/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: options.amount * 100 })
        });
        if (!orderRes.ok) throw new Error("Order creation failed");
        order = await orderRes.json();
    } catch (err) {
        console.error("Payment Error:", err);
        alert("Could not initiate payment. Please try again.");
        return;
    }

    const rzpKey = "rzp_live_SASJuIbktThdAO";

    const razorpayOptions = {
        key: rzpKey,
        amount: order.amount,
        currency: order.currency,
        name: "CallHub AI",
        description: options.description,
        order_id: order.id, // IMPORTANT: Linking valid order
        image: "https://your-logo-url.com/logo.png",
        handler: function (response: any) {
            // Sends PaymentID, OrderID, and Signature for verification
            options.onSuccess(response);
        },
        prefill: {
            name: options.name,
            email: options.userEmail,
            contact: options.userPhone || ""
        },
        theme: {
            color: "#FF9ACB"
        }
    };

    const rzp = new (window as any).Razorpay(razorpayOptions);
    rzp.on('payment.failed', function (response: any) {
        options.onFailure(response.error);
    });
    rzp.open();
};
