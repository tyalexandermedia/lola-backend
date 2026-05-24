# Schema blocks reference (per /lp/* page)

This is the doc for the JSON-LD blocks injected into each LP page's `<head>`.
Edit here, then sync into each HTML file.

## LocalBusiness (same on every page — keyed by URL)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://lola.tyalexandermedia.com/lp/<SLUG>#business",
  "name": "Ty Alexander Media",
  "image": "https://lola.tyalexandermedia.com/coach-ty.jpg",
  "url": "https://tyalexandermedia.com",
  "telephone": "+1-727-300-6573",
  "email": "ty@tyalexandermedia.com",
  "priceRange": "$47-$697",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Tampa Bay",
    "addressRegion": "FL",
    "addressCountry": "US"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "27.9506", "longitude": "-82.4572" },
  "areaServed": [
    { "@type": "State", "name": "Florida" },
    { "@type": "City", "name": "Tampa" },
    { "@type": "City", "name": "St. Petersburg" },
    { "@type": "City", "name": "Clearwater" },
    { "@type": "City", "name": "Palm Harbor" },
    { "@type": "City", "name": "Dunedin" },
    { "@type": "City", "name": "Brandon" },
    { "@type": "City", "name": "Bradenton" }
  ],
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    "opens": "08:00",
    "closes": "18:00"
  },
  "sameAs": ["https://www.instagram.com/tyalexandermedia"]
}
```

## Person — Coach Ty (same on every page — keyed by URL)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://tyalexandermedia.com#person",
  "name": "Coach Ty",
  "givenName": "Ty",
  "jobTitle": "Founder, Local SEO Strategist",
  "image": "https://lola.tyalexandermedia.com/coach-ty.jpg",
  "url": "https://tyalexandermedia.com",
  "email": "ty@tyalexandermedia.com",
  "telephone": "+1-727-300-6573",
  "address": { "@type": "PostalAddress", "addressLocality": "Tampa Bay", "addressRegion": "FL", "addressCountry": "US" },
  "sameAs": ["https://www.instagram.com/tyalexandermedia"],
  "worksFor": { "@id": "https://lola.tyalexandermedia.com/lp/<SLUG>#business" },
  "knowsAbout": [
    "Local SEO",
    "Google Business Profile optimization",
    "Florida contractor marketing",
    "AI Search Visibility",
    "Soft wash SEO",
    "Home service contractor marketing"
  ]
}
```

## Service (existing — already on each LP per spec)
## FAQ (only on /retainer — per spec)
## BreadcrumbList (per page)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://lola.tyalexandermedia.com/" },
    { "@type": "ListItem", "position": 2, "name": "Industries", "item": "https://lola.tyalexandermedia.com/lp/industries" },
    { "@type": "ListItem", "position": 3, "name": "<page name>", "item": "https://lola.tyalexandermedia.com/lp/<SLUG>" }
  ]
}
```

Validate every page through https://validator.schema.org/ before deploy.
