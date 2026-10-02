import { usePageMeta } from './lib/seo';
import { useReveal } from './lib/useReveal';

const CHECKS = [
  ['Business profile match', '25%', 'Confidence that the returned public listing matches the requested business; this does not verify ownership or full profile completeness.'],
  ['Reviews', '20%', 'Available rating and review count: 60% rating, 40% count, with the count contribution capped at 50 reviews.'],
  ['Mobile speed', '20%', 'Available Lighthouse mobile performance score.'],
  ['SEO basics', '10%', 'Available Lighthouse SEO score.'],
  ['Accessibility', '10%', 'Available Lighthouse accessibility score.'],
  ['Local contact information', '10%', 'Address and phone presence in returned business data. A hidden service-area address is not evidence that the business is ineligible.'],
  ['Site safety', '5%', 'Available Safe Browsing response; an unavailable response is not treated as a clean result.'],
] as const;

export default function Methodology() {
  usePageMeta('/methodology');
  useReveal();
  return (
    <main className="flex flex-1 flex-col">
      <section className="pt-4 sm:pt-8">
        <p className="text-sm font-semibold text-gold">Growth Score · Methodology</p>
        <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">What your free Growth Score checks.</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-ink-2">
          Complete the form in about one minute. When checks succeed, an on-screen report shows a snapshot of available public business information and website checks, plus recommended fixes. No account or payment is required; phone is required and email is optional.
        </p>
      </section>
      <section className="mt-10 rounded-xl border border-black/10 bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-semibold text-ink">Seven checks, weighted by available data</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm text-ink-2">
            <caption className="sr-only">Automated home-service score checks and configured weights</caption>
            <thead><tr><th scope="col" className="p-3">Check</th><th scope="col" className="p-3">Weight</th><th scope="col" className="p-3">What it measures</th></tr></thead>
            <tbody>{CHECKS.map(([name, weight, detail]) => <tr key={name} className="border-t border-black/10"><th scope="row" className="p-3 font-medium">{name}</th><td className="p-3">{weight}</td><td className="p-3 leading-relaxed">{detail}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-5 leading-relaxed text-ink-2">The score is the weighted average of available checks, rounded to a whole number. Unavailable checks are excluded and the remaining weights are normalized. When less than 30% of the configured weight is available, the score is incomplete. A score based on limited data should not be compared as if every check succeeded.</p>
        <p className="mt-4 leading-relaxed text-ink-2">These are configured diagnostic weights, not a model of Google’s ranking algorithm. Listing-match confidence is a proxy, and recommendations need review in your business context.</p>
      </section>
      <section className="mt-10 max-w-3xl">
        <h2 className="text-xl font-semibold text-ink">What needs separate verification</h2>
        <p className="mt-4 leading-relaxed text-ink-2">The free score does not establish search rankings, live AI recommendations, citation consistency, missed calls, response times, customer reactivation opportunities or revenue. Those require separate measurements, owner answers or connected records. We distinguish observed findings from owner-provided information and unavailable evidence.</p>
        <p className="mt-4 leading-relaxed text-ink-2">Foundation, Growth, Authority, AI Visibility, Reputation and Revenue Tracking describe the ongoing service roadmap. They are not the seven inputs used by this automated score. Notifications depend on configured providers; an on-screen result does not prove email or SMS delivery.</p>
        <a href="/growth-score" className="mt-6 inline-flex min-h-[48px] items-center rounded-lg bg-gold px-5 font-semibold text-on-gold">Run my free Growth Score →</a>
      </section>
    </main>
  );
}
