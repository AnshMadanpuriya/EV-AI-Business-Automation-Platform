import React, { useEffect, useState } from 'react';
import { Check, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { formatBillingPrice } from '../../utils/billingCheckout';

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    API.get('/payments/plans', { signal: controller.signal })
      .then(({ data }) => setCatalog(data))
      .catch(() => {
        if (!controller.signal.aborted) setError('Pricing could not be loaded. Please try again.');
      });
    return () => controller.abort();
  }, [retry]);

  const cycle = annual ? 'annual' : 'monthly';
  const plans = (catalog?.plans || []).filter(plan => plan.billingCycle === cycle);

  return (
    <section id="pricing" className="py-20 sm:py-24 bg-ev-dark relative">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="section-label">Built for EV businesses</span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white mt-3 mb-4">
            A smaller price. A smarter workflow.
          </h2>
          <p className="text-gray-400">Choose a platform plan that fits your team.</p>
          <div className="inline-flex items-center bg-ev-card border border-ev-border rounded-full p-1 mt-7" role="group" aria-label="Pricing billing cycle">
            <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-medium ${!annual ? 'bg-ev-blue text-white' : 'text-gray-400'}`}>Monthly</button>
            <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-medium ${annual ? 'bg-ev-blue text-white' : 'text-gray-400'}`}>
              Annual <span className="text-emerald-300 text-xs ml-1">Save 20%</span>
            </button>
          </div>
        </div>

        {error ? (
          <div role="alert" className="text-center text-gray-300 p-8 rounded-2xl border border-ev-border">
            <p>{error}</p>
            <button type="button" onClick={() => setRetry(value => value + 1)} className="btn-secondary inline-flex items-center gap-2 mt-4"><RefreshCw size={15} /> Retry pricing</button>
          </div>
        ) : !catalog ? (
          <p role="status" className="text-center text-gray-400 py-12">Loading current plans…</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {plans.map(plan => {
              const featured = plan.name === 'Growth';
              return (
                <article key={plan.code} className={`rounded-2xl p-6 sm:p-7 relative flex flex-col border bg-ev-card ${featured ? 'border-ev-blue shadow-blue-glow' : 'border-ev-border'}`}>
                  {featured && <span className="absolute -top-3 left-6 bg-ev-blue text-white text-xs font-semibold px-3 py-1 rounded-full">For growing teams</span>}
                  <h3 className="font-display font-bold text-white text-xl mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm min-h-10">{plan.description}</p>
                  <div className="mt-6 mb-2 text-white">
                    <span className="font-display font-extrabold text-3xl tabular-nums">{formatBillingPrice(plan.amountPaise)}</span>
                    <span className="text-gray-400 text-sm">/{annual ? 'year' : 'month'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-6">
                    {annual ? 'Full year billed together · save 20%' : 'Billed monthly'}
                  </p>
                  <ul className="space-y-3 mb-7 flex-1">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-300"><Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />{feature}</li>
                    ))}
                  </ul>
                  <Link to={`/subscribe/${plan.code}`} className={`${featured ? 'btn-primary' : 'btn-secondary'} flex items-center justify-center gap-2 w-full py-3 text-sm`}>
                    Choose {plan.name} <ArrowRight size={16} />
                  </Link>
                  <p className="text-center text-xs text-gray-400 mt-3">UPI AutoPay · Card · Bank mandate</p>
                </article>
              );
            })}
          </div>
        )}

        <div className="max-w-3xl mx-auto text-center mt-7 text-xs text-gray-400 leading-relaxed">
          <p className="flex items-center justify-center gap-2 text-gray-300 mb-2"><ShieldCheck size={15} className="text-emerald-400" /> Payment details stay in Razorpay Checkout.</p>
          <p>{catalog?.billingNote}</p>
          <p className="mt-1">Review your recurring amount before authorising. You can request cancellation from your billing page.</p>
        </div>
      </div>
    </section>
  );
}
