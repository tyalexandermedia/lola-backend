import { BRAND, ORIGIN, PROOF, SITE, absoluteUrl, val } from './config';

const BUSINESS_ID = `${ORIGIN}/#business`;
const WEBSITE_ID = `${ORIGIN}/#website`;

/** The business node. Same on every page, keyed by @id so crawlers merge it. */
export function businessNode(): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': SITE.schemaType || 'LocalBusiness',
    '@id': BUSINESS_ID,
    name: SITE.publicName,
    legalName: SITE.legalName,
    url: `${ORIGIN}/`,
    telephone: SITE.phone,
    email: SITE.email,
    image: absoluteUrl(val(BRAND.ogImage) || BRAND.logo),
    logo: absoluteUrl(BRAND.logo),
    areaServed: SITE.serviceArea.cities.map((c) => ({ '@type': 'City', name: c })),
    openingHoursSpecification: SITE.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
  };
  const address = val(SITE.address);
  if (address) {
    node.address = {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.region,
      postalCode: address.postalCode,
      addressCountry: address.country,
    };
  } else {
    // Service-area business: no street address published, region only.
    node.address = { '@type': 'PostalAddress', addressRegion: SITE.serviceArea.region, addressCountry: 'US' };
  }
  const founding = val(SITE.foundingYear);
  if (founding) node.foundingDate = String(founding);
  const social = Object.values(SITE.social || {}).map((s) => val(s)).filter(Boolean);
  if (social.length) node.sameAs = social;
  const rating = val(PROOF.googleRating);
  if (rating) {
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.rating,
      reviewCount: rating.count,
      bestRating: 5,
    };
  }
  return node;
}

export interface PageGraphInput {
  path: string;
  name: string;
  description: string;
  breadcrumb?: Array<{ name: string; path: string }>;
  service?: { name: string; description: string };
  faqs?: Array<{ q: string; a: string }>;
}

/** Everything a page needs in ONE @graph block. */
export function pageGraph(input: PageGraphInput): Record<string, unknown> {
  const url = absoluteUrl(input.path);
  const graph: Record<string, unknown>[] = [
    businessNode(),
    { '@type': 'WebSite', '@id': WEBSITE_ID, url: `${ORIGIN}/`, name: SITE.publicName, publisher: { '@id': BUSINESS_ID } },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: input.name,
      description: input.description,
      inLanguage: 'en-US',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': BUSINESS_ID },
    },
  ];
  const crumbs = [{ name: 'Home', path: '/' }, ...(input.breadcrumb || [])];
  if (crumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: absoluteUrl(c.path),
      })),
    });
  }
  if (input.service) {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: input.service.name,
      description: input.service.description,
      url,
      provider: { '@id': BUSINESS_ID },
      areaServed: SITE.serviceArea.cities.map((c) => ({ '@type': 'City', name: c })),
    });
  }
  // FAQPage is only emitted when the same questions are visibly rendered on
  // the page (the Faq component receives the identical array).
  if (input.faqs && input.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: input.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
