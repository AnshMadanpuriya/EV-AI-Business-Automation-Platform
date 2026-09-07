export function formatBillingPrice(amountPaise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: amountPaise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);
}

// Highlight the preference without hiding a supported bank/mandate fallback.
// Razorpay controls which methods are eligible for this account/subscription.
export function paymentPreferenceConfig(preference) {
  const isUpi = preference === 'upi';
  return {
    display: {
      blocks: {
        preferred: {
          name: isUpi ? 'Your choice: UPI' : 'Your choice: Card / Bank',
          instruments: isUpi
            ? [{ method: 'upi' }]
            : [{ method: 'card' }, { method: 'netbanking' }],
        },
      },
      sequence: ['block.preferred'],
      preferences: { show_default_blocks: true },
    },
  };
}

let checkoutPromise;
export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutPromise) return checkoutPromise;

  checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => finish(false), 15000);
    function finish(ok) {
      window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (ok && window.Razorpay) resolve();
      else {
        script.remove();
        checkoutPromise = undefined;
        reject(new Error('Razorpay Checkout could not load. Check your connection and try again.'));
      }
    }
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    document.body.appendChild(script);
  });
  return checkoutPromise;
}
