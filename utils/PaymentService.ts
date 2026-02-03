
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
        alert('Razorpay SDK failed to load. Please check your internet connection.');
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

        const data = await orderRes.json();

        if (!orderRes.ok) {
            throw new Error(data.detail?.error?.description || data.error || "Order creation failed");
        }
        order = data;
    } catch (err: any) {
        console.error("Payment Error:", err);
        alert(`Payment Initialization Failed: ${err.message}`);
        return;
    }

    const rzpKey = "rzp_live_SASJuIbktThdAO";

    const razorpayOptions = {
        key: rzpKey,
        amount: order.amount,
        currency: order.currency,
        name: "CallHub AI",
        description: options.description,
        order_id: order.id,
        image: "https://your-logo-url.com/logo.png",
        handler: function (response: any) {
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
