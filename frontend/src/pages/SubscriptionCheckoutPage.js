import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ACTIVE_STATUSES = ['created', 'authenticated', 'active', 'pending', 'paused', 'halted'];
const CHECKOUT_BLOCKING_STATUSES = ['authenticated', 'active', 'pending', 'paused', 'halted'];

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatPrice(amountPaise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

function statusTone(status) {
  if (['active', 'authenticated', 'completed'].includes(status)) {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }
  if (['halted', 'failed', 'expired'].includes(status)) {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }
  return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
}

export default function SubscriptionCheckoutPage() {
  const { planCode } = useParams();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedCode, setSelectedCode] = useState(planCode || 'growth_monthly');
  const [current, setCurrent] = useState(null);
  const [mode, setMode] = useState('test');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      API.get('/payments/plans'),
      API.get('/payments/subscription'),
    ])
      .then(([plansResponse, subscriptionResponse]) => {
        if (!active) return;
        setPlans(plansResponse.data.plans || []);
        setMode(plansResponse.data.mode || 'test');
        setCurrent(subscriptionResponse.data.subscription || null);
      })
      .catch((error) => {
        if (active) {
          setNotice({
            type: 'error',
            text: error.response?.data?.message || 'Unable to load secure billing.',
          });
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const selectedPlan = useMemo(() => (
    plans.find((plan) => plan.code === selectedCode)
    || plans.find((plan) => plan.code === planCode)
    || plans[0]
  ), [planCode, plans, selectedCode]);

  const productPlans = useMemo(() => (
    plans.filter((plan) => plan.name === selectedPlan?.name)
  ), [plans, selectedPlan]);

  const refreshSubscription = async () => {
    const { data } = await API.get('/payments/subscription');
    setCurrent(data.subscription || null);
  };

  const startCheckout = async () => {
    if (!selectedPlan || processing) return;
    setProcessing(true);
    setNotice(null);

    try {
      const scriptReady = await loadRazorpayCheckout();
      if (!scriptReady) throw new Error('Secure checkout could not be loaded.');

      const { data } = await API.post('/payments/subscriptions', {
        planCode: selectedPlan.code,
      });
      const checkout = data.checkout;

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: 'EV AI Business Automation',
        description: `${data.plan.name} · ${data.plan.billingCycle} subscription`,
        image: '/ev-ai-chatbot-logo.png',
        prefill: {
          name: checkout.customer.name || '',
          email: checkout.customer.email || '',
          contact: checkout.customer.phone || '',
        },
        notes: {
          plan_code: data.plan.code,
        },
        theme: { color: '#0066FF' },
        handler: async (response) => {
          try {
            await API.post('/payments/subscriptions/verify', response);
            await refreshSubscription();
            setNotice({
              type: 'success',
              text: 'Payment authorised securely. Your subscription status is being confirmed.',
            });
          } catch (error) {
            setNotice({
              type: 'error',
              text: error.response?.data?.message || 'Payment signature verification failed.',
            });
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          confirm_close: true,
          escape: true,
          ondismiss: () => setProcessing(false),
        },
        retry: { enabled: true },
      });

      razorpay.on('payment.failed', () => {
        setNotice({
          type: 'error',
          text: 'Payment was not completed. No subscription access has been activated.',
        });
        setProcessing(false);
      });
      razorpay.open();
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.response?.data?.message || error.message || 'Checkout could not be started.',
      });
      setProcessing(false);
    }
  };

  const cancelSubscription = async () => {
    if (!window.confirm('Cancel this subscription at the end of its current billing cycle?')) {
      return;
    }

    setCancelling(true);
    setNotice(null);
    try {
      const { data } = await API.post('/payments/subscription/cancel');
      setCurrent(data.subscription);
      setNotice({
        type: 'success',
        text: 'Cancellation scheduled for the end of the current billing cycle.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.response?.data?.message || 'Subscription could not be cancelled.',
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ev-darker text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-ev-blue" size={32} />
      </div>
    );
  }

  const hasCurrentSubscription = current && ACTIVE_STATUSES.includes(current.status);
  const checkoutBlocked = current && CHECKOUT_BLOCKING_STATUSES.includes(current.status);

  return (
    <main className="min-h-screen bg-ev-darker text-white px-4 py-10 sm:py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-10">
          <Link to="/" className="font-display font-bold text-lg text-white no-underline">
            ⚡ EV <span className="text-ev-cyan">AI</span>
          </Link>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">
            Back to dashboard
          </Link>
        </div>

        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-ev-blue/30 bg-ev-blue/10 px-3 py-1 text-xs text-blue-200 mb-4">
            <ShieldCheck size={14} />
            Razorpay secure checkout · {mode === 'live' ? 'Live mode' : 'Test mode'}
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold">
            Activate your EV AI workspace
          </h1>
          <p className="text-gray-400 mt-4">
            Pay using UPI AutoPay, supported cards or bank mandate directly inside Razorpay.
          </p>
        </div>

        {notice && (
          <div className={`max-w-3xl mx-auto mb-6 rounded-xl border p-4 flex items-start gap-3 ${
            notice.type === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              : 'border-red-400/30 bg-red-400/10 text-red-100'
          }`}>
            {notice.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="text-sm">{notice.text}</span>
          </div>
        )}

        {hasCurrentSubscription && (
          <section className={`max-w-3xl mx-auto mb-7 rounded-2xl border p-5 ${statusTone(current.status)}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-70">Current subscription</div>
                <div className="font-display font-bold text-xl mt-1">
                  {current.planName} · <span className="capitalize">{current.status}</span>
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {current.cancelAtCycleEnd
                    ? 'Cancellation is scheduled at the end of this billing cycle.'
                    : 'Subscription updates are confirmed through signed Razorpay webhooks.'}
                </div>
              </div>
              {!current.cancelAtCycleEnd && (
                <button
                  type="button"
                  onClick={cancelSubscription}
                  disabled={cancelling}
                  className="rounded-lg border border-current/30 px-4 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  {cancelling ? 'Scheduling…' : 'Cancel at cycle end'}
                </button>
              )}
            </div>
          </section>
        )}

        <section className="max-w-3xl mx-auto rounded-3xl border border-ev-border bg-ev-card shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-[1fr_0.86fr]">
            <div className="p-6 sm:p-8">
              <div className="text-xs text-ev-cyan uppercase tracking-widest mb-2">Selected plan</div>
              <h2 className="font-display font-bold text-3xl">{selectedPlan?.name || 'Plan'}</h2>
              <p className="text-sm text-gray-400 mt-2">{selectedPlan?.description}</p>

              <div className="flex gap-2 mt-6">
                {productPlans.map((plan) => (
                  <button
                    type="button"
                    key={plan.code}
                    onClick={() => setSelectedCode(plan.code)}
                    className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold capitalize ${
                      selectedPlan?.code === plan.code
                        ? 'border-ev-blue bg-ev-blue/15 text-white'
                        : 'border-ev-border text-gray-400 hover:text-white'
                    }`}
                  >
                    {plan.billingCycle}
                  </button>
                ))}
              </div>

              <div className="mt-7 flex items-end gap-2">
                <span className="font-display text-4xl font-extrabold">
                  {selectedPlan ? formatPrice(selectedPlan.amountPaise) : '—'}
                </span>
                <span className="text-gray-500 mb-1">
                  /{selectedPlan?.billingCycle === 'annual' ? 'year' : 'month'}
                </span>
              </div>

              {selectedPlan?.billingCycle === 'annual' && (
                <div className="text-xs text-emerald-300 mt-2">Includes 20% annual billing savings</div>
              )}

              <ul className="space-y-3 mt-7">
                {(selectedPlan?.features || []).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-ev-border bg-black/20 p-6 sm:p-8 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl border border-ev-border bg-ev-darker/60 p-4 text-center">
                  <Smartphone size={22} className="mx-auto text-ev-cyan" />
                  <div className="text-xs text-gray-300 mt-2">UPI AutoPay</div>
                </div>
                <div className="rounded-xl border border-ev-border bg-ev-darker/60 p-4 text-center">
                  <CreditCard size={22} className="mx-auto text-ev-cyan" />
                  <div className="text-xs text-gray-300 mt-2">Card / Bank</div>
                </div>
              </div>

              <button
                type="button"
                onClick={startCheckout}
                disabled={
                  processing
                  || !selectedPlan?.configured
                  || Boolean(checkoutBlocked)
                }
                className="btn-primary w-full min-h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
                {processing
                  ? 'Opening secure checkout…'
                  : checkoutBlocked
                    ? 'Subscription already exists'
                    : 'Continue to secure payment'}
              </button>

              {!selectedPlan?.configured && (
                <p className="text-xs text-amber-300 text-center mt-3">
                  Razorpay Plan ID is not configured for this billing option.
                </p>
              )}

              <div className="mt-6 space-y-3 text-xs text-gray-500 leading-relaxed">
                <p className="flex items-start gap-2">
                  <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                  Card, bank and UPI details are entered only in Razorpay Checkout and are never stored by this application.
                </p>
                <p>
                  Signed backend verification and webhooks control subscription access. Availability of UPI AutoPay depends on your Razorpay account and the customer’s supported app or bank.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-gray-600 mt-6">
          Signed-in account: {user?.email}
        </div>
      </div>
    </main>
  );
}
