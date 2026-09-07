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
  Phone,
  RefreshCw,
} from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatBillingPrice, loadRazorpayCheckout, paymentPreferenceConfig } from '../utils/billingCheckout';

const ACTIVE_STATUSES = ['created', 'authenticated', 'active', 'pending', 'paused', 'halted'];
const CHECKOUT_BLOCKING_STATUSES = ['authenticated', 'active', 'pending', 'paused', 'halted'];

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
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [supportPhone, setSupportPhone] = useState('');
  const [billingNote, setBillingNote] = useState('');
  const [checkoutConfigured, setCheckoutConfigured] = useState(false);
  const [retry, setRetry] = useState(0);
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
        setSupportPhone(plansResponse.data.support?.phone || '');
        setBillingNote(plansResponse.data.billingNote || '');
        setCheckoutConfigured(Boolean(plansResponse.data.checkoutConfigured));
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
  }, [retry]);

  useEffect(() => {
    setSelectedCode(planCode || 'growth_monthly');
  }, [planCode]);

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
    if (!selectedPlan?.configured || !checkoutConfigured || processing || cancelling) return;
    setProcessing(true);
    setNotice(null);

    try {
      await loadRazorpayCheckout();

      const { data } = await API.post('/payments/subscriptions', {
        planCode: selectedPlan.code,
      });
      const checkout = data.checkout;
      if (data.subscription) setCurrent(data.subscription);

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
        config: paymentPreferenceConfig(paymentMethod),
        handler: async (response) => {
          try {
            await API.post('/payments/subscriptions/verify', response);
            await refreshSubscription();
            setNotice({
              type: 'success',
              text: data.mode === 'test'
                ? 'Test authorisation received. No real money was charged. Refresh status after confirmation arrives.'
                : 'Payment authorisation verified. Refresh status to see the latest confirmation.',
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
          text: 'This payment attempt was not completed. You can retry inside Razorpay or close Checkout.',
        });
      });
      razorpay.open();
    } catch (error) {
      if (error.response?.data?.subscription) setCurrent(error.response.data.subscription);
      setNotice({
        type: 'error',
        text: error.response?.data?.message || error.message || 'Checkout could not be started.',
      });
      setProcessing(false);
    }
  };

  const cancelSubscription = async () => {
    const hasPaidCycle = current?.status !== 'created' && Boolean(current?.currentEnd);
    if (!window.confirm(hasPaidCycle ? 'Cancel renewal at the end of this billing cycle?' : 'Cancel this unfinished subscription?')) {
      return;
    }

    setCancelling(true);
    setNotice(null);
    try {
      const { data } = await API.post('/payments/subscription/cancel');
      setCurrent(data.subscription);
      setNotice({
        type: 'success',
        text: data.subscription.cancelAtCycleEnd
          ? 'Cancellation scheduled for the end of the current billing cycle.'
          : 'The unfinished subscription has been cancelled.',
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
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold">
            Your plan. Your payment choice.
          </h1>
          <p className="text-gray-400 mt-4">
            Choose a preferred method, then authorise your subscription in Razorpay Checkout.
          </p>
          {mode === 'test' && <p className="text-xs text-amber-200 mt-3">Test mode · No real money is transferred.</p>}
        </div>

        {notice && (
          <div className={`max-w-3xl mx-auto mb-6 rounded-xl border p-4 flex items-start gap-3 ${
            notice.type === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
              : 'border-red-400/30 bg-red-400/10 text-red-100'
          }`}>
            {notice.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="text-sm" role="status">{notice.text}</span>
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
                  className="rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling…' : current.currentEnd && current.status !== 'created' ? 'Cancel renewal' : 'Cancel unfinished checkout'}
                </button>
              )}
            </div>
          </section>
        )}

        <section className="max-w-4xl mx-auto rounded-3xl border border-ev-border bg-ev-card shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-[1fr_0.86fr]">
            <div className="p-6 sm:p-8 min-w-0">
              <div className="text-xs text-ev-cyan uppercase tracking-widest mb-2">Selected plan</div>
              <h2 className="font-display font-bold text-3xl">{selectedPlan?.name || 'Plan'}</h2>
              <p className="text-sm text-gray-400 mt-2">{selectedPlan?.description}</p>

              <div className="flex gap-2 mt-6">
                {productPlans.map((plan) => (
                  <button
                    type="button"
                    key={plan.code}
                    aria-pressed={selectedPlan?.code === plan.code}
                    disabled={processing || cancelling}
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

              <div className="mt-7 flex flex-wrap items-end gap-2">
                <span className="font-display text-3xl font-extrabold tabular-nums">
                  {selectedPlan ? formatBillingPrice(selectedPlan.amountPaise) : '—'}
                </span>
                <span className="text-gray-500 mb-1">
                  /{selectedPlan?.billingCycle === 'annual' ? 'year' : 'month'}
                </span>
              </div>

              {selectedPlan?.billingCycle === 'annual' && (
                <div className="text-xs text-emerald-300 mt-2">Save 20% · Full year billed together</div>
              )}
              {selectedPlan && (
                <p className="text-xs text-gray-400 leading-relaxed mt-3">
                  Recurs {selectedPlan.billingCycle === 'annual' ? 'yearly' : 'monthly'} for up to {selectedPlan.totalCount} billing cycles, unless cancelled earlier. Review the mandate amount in Checkout.
                </p>
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
              <fieldset disabled={processing || cancelling} className="mb-5">
                <legend className="text-sm text-gray-300 mb-3">Preferred payment method</legend>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'upi', label: 'UPI AutoPay', Icon: Smartphone },
                    { value: 'card_bank', label: 'Card / Bank', Icon: CreditCard },
                  ].map(({ value, label, Icon }) => (
                    <label key={value} className={`relative cursor-pointer rounded-xl border p-4 text-center transition-colors ${paymentMethod === value ? 'border-ev-blue bg-ev-blue/15' : 'border-ev-border bg-ev-darker/60 hover:border-gray-500'}`}>
                      <input type="radio" name="payment-method" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="sr-only peer" />
                      <span className="absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-ev-cyan" />
                      <Icon size={24} className="mx-auto text-ev-cyan" />
                      <span className="block text-sm text-white mt-2">{label}</span>
                      <span aria-hidden="true" className={`block text-xs mt-1 ${paymentMethod === value ? 'text-blue-200' : 'text-gray-500'}`}>{paymentMethod === value ? 'Selected' : 'Select'}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-gray-400 leading-relaxed mb-5">
                Your choice is highlighted in Checkout. Available UPI apps, cards and bank mandates depend on Razorpay and your bank.
              </p>

              <button
                type="button"
                onClick={startCheckout}
                disabled={
                  processing
                  || cancelling
                  || !checkoutConfigured
                  || !selectedPlan?.configured
                  || Boolean(checkoutBlocked)
                }
                className="btn-primary w-full min-h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : <LockKeyhole size={18} />}
                {processing
                  ? 'Opening secure checkout…'
                  : !checkoutConfigured || !selectedPlan?.configured
                    ? 'Payments opening soon'
                    : checkoutBlocked
                    ? 'Subscription already exists'
                    : paymentMethod === 'upi' ? 'Continue with UPI AutoPay' : 'Continue with card / bank'}
              </button>

              {(!selectedPlan?.configured || !checkoutConfigured) && <p role="status" className="text-xs text-amber-200 leading-relaxed text-center mt-3">Online payments for this plan are not ready yet. Billing support can help you get started.</p>}
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <button type="button" disabled={processing || cancelling} onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white"><RefreshCw size={13} /> Refresh status</button>
                {supportPhone && <a href={`tel:${supportPhone}`} className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white"><Phone size={13} /> Billing help</a>}
              </div>

              <div className="mt-6 space-y-3 text-xs text-gray-500 leading-relaxed">
                <p className="flex items-start gap-2">
                  <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                  Card, bank and UPI details are entered only in Razorpay Checkout and are never stored by this application.
                </p>
                <p>
                  {billingNote}
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
