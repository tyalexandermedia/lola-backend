# TAMPA BAY POWER CLEAN — READY-TO-USE SCHEMA MARKUP LIBRARY

**Copy-paste schema code for all page types. Customize [PLACEHOLDERS].**

---

## 📌 TABLE OF CONTENTS
1. Homepage Schema
2. Service Page Schema
3. Location Page Schema
4. Blog Post Schema
5. FAQ Page Schema
6. Local Business Schema
7. Review Schema
8. How-To Schema
9. Video Schema
10. Breadcrumb Schema

---

## 1️⃣ HOMEPAGE SCHEMA

**Place in `<head>` section of homepage**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.tampabaypowerclean.com/#organization",
      "name": "Tampa Bay Power Clean",
      "url": "https://www.tampabaypowerclean.com",
      "logo": "https://www.tampabaypowerclean.com/images/logo.png",
      "description": "Professional exterior cleaning company providing pressure washing, roof cleaning, paver sealing, soft washing, and commercial cleaning services in Dunedin and Tampa Bay, Florida.",
      "email": "contact@tampabaypowerclean.com",
      "telephone": "+17277126281",
      "founder": "[Founder Name]",
      "foundingDate": "[YYYY]",
      "areaServed": [
        {
          "@type": "City",
          "name": "Dunedin",
          "addressCountry": "US",
          "addressRegion": "FL"
        },
        {
          "@type": "City",
          "name": "Clearwater",
          "addressCountry": "US",
          "addressRegion": "FL"
        },
        {
          "@type": "City",
          "name": "Palm Harbor",
          "addressCountry": "US",
          "addressRegion": "FL"
        },
        {
          "@type": "City",
          "name": "Safety Harbor",
          "addressCountry": "US",
          "addressRegion": "FL"
        },
        {
          "@type": "City",
          "name": "Tarpon Springs",
          "addressCountry": "US",
          "addressRegion": "FL"
        },
        {
          "@type": "City",
          "name": "Ozona",
          "addressCountry": "US",
          "addressRegion": "FL"
        },
        {
          "@type": "City",
          "name": "Crystal Beach",
          "addressCountry": "US",
          "addressRegion": "FL"
        },
        {
          "@type": "City",
          "name": "Oldsmar",
          "addressCountry": "US",
          "addressRegion": "FL"
        }
      ],
      "sameAs": [
        "https://www.facebook.com/tampabaypowerclean",
        "https://www.google.com/maps/place/Tampa+Bay+Power+Clean",
        "https://www.yelp.com/biz/tampa-bay-power-clean",
        "https://www.instagram.com/tampabaypowerclean"
      ],
      "contact": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "telephone": "+17277126281",
        "email": "contact@tampabaypowerclean.com",
        "hoursAvailable": "Mo-Su 08:00-18:00"
      }
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://www.tampabaypowerclean.com/#localbusiness",
      "name": "Tampa Bay Power Clean",
      "url": "https://www.tampabaypowerclean.com",
      "image": "https://www.tampabaypowerclean.com/images/tampa-bay-power-clean-hero.png",
      "description": "Trusted pressure washing, roof cleaning, and exterior cleaning services for Dunedin and Tampa Bay.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "[Your Street Address]",
        "addressLocality": "Dunedin",
        "addressRegion": "FL",
        "postalCode": "34698",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "28.0168",
        "longitude": "-82.7764"
      },
      "telephone": "+17277126281",
      "email": "contact@tampabaypowerclean.com",
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "08:00",
        "closes": "18:00"
      },
      "priceRange": "$$",
      "areaServed": [
        {"@type": "City", "name": "Dunedin"},
        {"@type": "City", "name": "Clearwater"},
        {"@type": "City", "name": "Palm Harbor"},
        {"@type": "City", "name": "Safety Harbor"},
        {"@type": "City", "name": "Tarpon Springs"},
        {"@type": "City", "name": "Ozona"},
        {"@type": "City", "name": "Crystal Beach"},
        {"@type": "City", "name": "Oldsmar"}
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "75",
        "bestRating": "5",
        "worstRating": "1"
      },
      "makesOffer": [
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Pressure Washing"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Roof Cleaning"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "House Washing"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Soft Washing"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Paver Sealing"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Driveway Cleaning"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Pool Cage Cleaning"}},
        {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Commercial Pressure Washing"}}
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://www.tampabaypowerclean.com/#website",
      "url": "https://www.tampabaypowerclean.com",
      "name": "Tampa Bay Power Clean",
      "publisher": {"@id": "https://www.tampabaypowerclean.com/#organization"}
    },
    {
      "@type": "WebPage",
      "@id": "https://www.tampabaypowerclean.com/#webpage",
      "url": "https://www.tampabaypowerclean.com",
      "name": "Pressure Washing, Roof Cleaning & Exterior Services in Dunedin, FL",
      "description": "Professional pressure washing, roof cleaning, paver sealing, soft washing, and commercial cleaning in Dunedin and Tampa Bay.",
      "isPartOf": {"@id": "https://www.tampabaypowerclean.com/#website"},
      "about": {"@id": "https://www.tampabaypowerclean.com/#localbusiness"},
      "image": "https://www.tampabaypowerclean.com/images/tampa-bay-power-clean-hero.png"
    }
  ]
}
</script>
```

---

## 2️⃣ SERVICE PAGE SCHEMA

**Place on service pages (e.g., `/services/roof-cleaning/`)**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Professional [SERVICE NAME] in [CITY], FL",
  "url": "https://www.tampabaypowerclean.com/services/[service-slug]/",
  "description": "[2-3 sentence description of service]",
  "image": "https://www.tampabaypowerclean.com/images/[service]-hero.jpg",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Tampa Bay Power Clean",
    "url": "https://www.tampabaypowerclean.com",
    "telephone": "+17277126281",
    "areaServed": [
      {"@type": "City", "name": "Dunedin"},
      {"@type": "City", "name": "Clearwater"},
      {"@type": "City", "name": "Palm Harbor"},
      {"@type": "City", "name": "Safety Harbor"},
      {"@type": "City", "name": "Tarpon Springs"}
    ]
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "[SERVICE] Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "name": "Residential [SERVICE]",
        "priceCurrency": "USD",
        "price": "Call for quote",
        "availability": "https://schema.org/InStock",
        "url": "https://www.tampabaypowerclean.com/services/[service-slug]/"
      },
      {
        "@type": "Offer",
        "name": "Commercial [SERVICE]",
        "priceCurrency": "USD",
        "price": "Call for quote",
        "availability": "https://schema.org/InStock",
        "url": "https://www.tampabaypowerclean.com/services/[service-slug]/"
      }
    ]
  },
  "review": [
    {
      "@type": "Review",
      "author": {"@type": "Person", "name": "[Customer Name]"},
      "datePublished": "[YYYY-MM-DD]",
      "reviewRating": {"@type": "Rating", "ratingValue": "5"},
      "reviewBody": "[Customer testimonial about this service]"
    }
  ]
}
</script>
```

---

## 3️⃣ LOCATION PAGE SCHEMA

**Place on location pages (e.g., `/service-areas/clearwater/`)**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": "https://www.tampabaypowerclean.com/service-areas/[city]/#localbusiness",
      "name": "Tampa Bay Power Clean - [City]",
      "url": "https://www.tampabaypowerclean.com/service-areas/[city]/",
      "telephone": "+17277126281",
      "description": "[City]-based pressure washing and exterior cleaning specialists.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "[City]",
        "addressRegion": "FL",
        "postalCode": "[ZIP]",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "[LATITUDE]",
        "longitude": "[LONGITUDE]"
      },
      "areaServed": {
        "@type": "City",
        "name": "[City], FL"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "75"
      },
      "image": "https://www.tampabaypowerclean.com/images/[city]-hero.jpg"
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://www.tampabaypowerclean.com/service-areas/[city]/#breadcrumb",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.tampabaypowerclean.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Service Areas",
          "item": "https://www.tampabaypowerclean.com/service-areas/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "[City]",
          "item": "https://www.tampabaypowerclean.com/service-areas/[city]/"
        }
      ]
    }
  ]
}
</script>
```

---

## 4️⃣ BLOG POST SCHEMA

**Place on blog posts (e.g., `/blog/how-to-clean-roof/`)**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "[Blog Title]",
  "description": "[Meta description or first 160 chars]",
  "url": "https://www.tampabaypowerclean.com/blog/[article-slug]/",
  "image": "https://www.tampabaypowerclean.com/images/[article]-hero.jpg",
  "datePublished": "[YYYY-MM-DD]",
  "dateModified": "[YYYY-MM-DD]",
  "author": {
    "@type": "Organization",
    "name": "Tampa Bay Power Clean",
    "url": "https://www.tampabaypowerclean.com"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Tampa Bay Power Clean",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.tampabaypowerclean.com/images/logo.png",
      "width": 250,
      "height": 60
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.tampabaypowerclean.com/blog/[article-slug]/"
  }
}
</script>
```

---

## 5️⃣ FAQ PAGE SCHEMA

**Place on FAQ pages or service pages with FAQ section**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Question 1]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer 1]"
      }
    },
    {
      "@type": "Question",
      "name": "[Question 2]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer 2]"
      }
    },
    {
      "@type": "Question",
      "name": "[Question 3]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer 3]"
      }
    },
    {
      "@type": "Question",
      "name": "[Question 4]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer 4]"
      }
    },
    {
      "@type": "Question",
      "name": "[Question 5]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer 5]"
      }
    }
  ]
}
</script>
```

**Example (Real FAQ):**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How often should I have my roof professionally cleaned?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "In Florida's humid climate, we recommend professional roof cleaning every 2-3 years. This prevents algae and moss from causing long-term damage and extends your roof's lifespan significantly."
      }
    },
    {
      "@type": "Question",
      "name": "Is soft washing safe for my roof?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Soft washing uses low pressure and specialized cleaning solutions, making it safer than pressure washing. It's the recommended method for most residential roofing materials."
      }
    },
    {
      "@type": "Question",
      "name": "Will pressure washing damage my siding?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Professional pressure washing is safe when done correctly. However, high pressure can damage delicate surfaces like vinyl siding. We always use the appropriate pressure level for your specific material."
      }
    },
    {
      "@type": "Question",
      "name": "What's included in your service?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our service includes a free inspection, area preparation, professional cleaning, thorough rinsing, and a final walkthrough. We protect your landscaping and clean up afterwards."
      }
    },
    {
      "@type": "Question",
      "name": "How quickly can you schedule service?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer same-day or next-day service for most requests in the Dunedin and Clearwater area. Call 727-712-6281 to confirm availability."
      }
    }
  ]
}
</script>
```

---

## 6️⃣ REVIEW SCHEMA

**Add to pages with customer testimonials**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": {
    "@type": "Person",
    "name": "[Customer Name]"
  },
  "datePublished": "[YYYY-MM-DD]",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "5",
    "bestRating": "5",
    "worstRating": "1"
  },
  "reviewBody": "[Full testimonial/review text]",
  "itemReviewed": {
    "@type": "LocalBusiness",
    "name": "Tampa Bay Power Clean",
    "url": "https://www.tampabaypowerclean.com"
  }
}
</script>
```

**Example**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "author": {
    "@type": "Person",
    "name": "Michelle R."
  },
  "datePublished": "2024-06-15",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "5",
    "bestRating": "5",
    "worstRating": "1"
  },
  "reviewBody": "We hired Tampa Bay Power Clean to clean our roof and driveway. The team arrived on time, worked efficiently, and did an amazing job. Our roof looks brand new! Highly recommend for anyone in Clearwater.",
  "itemReviewed": {
    "@type": "LocalBusiness",
    "name": "Tampa Bay Power Clean",
    "url": "https://www.tampabaypowerclean.com"
  }
}
</script>
```

---

## 7️⃣ HOW-TO SCHEMA

**For maintenance guides and process pages**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "[How-To Title]",
  "description": "[2-3 sentence description]",
  "image": "https://www.tampabaypowerclean.com/images/[how-to]-hero.jpg",
  "estimatedCost": {
    "@type": "PriceSpecification",
    "priceCurrency": "USD",
    "price": "[Cost or Call for quote]"
  },
  "step": [
    {
      "@type": "HowToStep",
      "position": "1",
      "name": "[Step 1 Title]",
      "text": "[Step 1 description]",
      "image": "https://www.tampabaypowerclean.com/images/step-1.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "2",
      "name": "[Step 2 Title]",
      "text": "[Step 2 description]",
      "image": "https://www.tampabaypowerclean.com/images/step-2.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "3",
      "name": "[Step 3 Title]",
      "text": "[Step 3 description]",
      "image": "https://www.tampabaypowerclean.com/images/step-3.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "4",
      "name": "[Step 4 Title]",
      "text": "[Step 4 description]",
      "image": "https://www.tampabaypowerclean.com/images/step-4.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "5",
      "name": "[Step 5 Title]",
      "text": "[Step 5 description]",
      "image": "https://www.tampabaypowerclean.com/images/step-5.jpg"
    }
  ]
}
</script>
```

**Example (Roof Cleaning Process)**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How We Clean Your Roof Safely",
  "description": "Professional roof cleaning process used by Tampa Bay Power Clean for safe, effective results.",
  "image": "https://www.tampabaypowerclean.com/images/roof-cleaning-process.jpg",
  "step": [
    {
      "@type": "HowToStep",
      "position": "1",
      "name": "Inspection & Assessment",
      "text": "We inspect your roof thoroughly to assess the type and extent of growth, and determine the best cleaning method.",
      "image": "https://www.tampabaypowerclean.com/images/step-inspection.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "2",
      "name": "Area Preparation",
      "text": "We protect landscaping, outdoor furniture, and other areas. We lay down tarps and move items to safe locations.",
      "image": "https://www.tampabaypowerclean.com/images/step-prep.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "3",
      "name": "Cleaning Solution Application",
      "text": "For soft wash cleaning, we apply our eco-friendly solution and let it work. For pressure washing, we use appropriate pressure levels.",
      "image": "https://www.tampabaypowerclean.com/images/step-cleaning.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "4",
      "name": "Thorough Rinsing",
      "text": "We rinse your roof completely to remove all cleaning solution and debris.",
      "image": "https://www.tampabaypowerclean.com/images/step-rinsing.jpg"
    },
    {
      "@type": "HowToStep",
      "position": "5",
      "name": "Final Inspection & Follow-Up",
      "text": "We perform a final walkthrough to ensure complete satisfaction and provide care tips to extend roof life.",
      "image": "https://www.tampabaypowerclean.com/images/step-final.jpg"
    }
  ]
}
</script>
```

---

## 8️⃣ VIDEO SCHEMA

**For embedded videos on pages**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "[Video Title]",
  "description": "[Video description]",
  "thumbnailUrl": "https://www.tampabaypowerclean.com/images/[video]-thumbnail.jpg",
  "uploadDate": "[YYYY-MM-DD]",
  "duration": "[PT1M30S]",
  "contentUrl": "https://www.youtube.com/watch?v=[VIDEO_ID]",
  "embedUrl": "https://www.youtube.com/embed/[VIDEO_ID]"
}
</script>
```

---

## 9️⃣ BREADCRUMB SCHEMA

**For all pages (especially service & location pages)**:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://www.tampabaypowerclean.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Section - Services/Areas]",
      "item": "https://www.tampabaypowerclean.com/[section]/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Current Page]",
      "item": "https://www.tampabaypowerclean.com/[current-url]/"
    }
  ]
}
</script>
```

**Examples**:

**Service Page Breadcrumb**:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://www.tampabaypowerclean.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Services",
      "item": "https://www.tampabaypowerclean.com/services/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Roof Cleaning",
      "item": "https://www.tampabaypowerclean.com/services/roof-cleaning/"
    }
  ]
}
</script>
```

**Location Page Breadcrumb**:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://www.tampabaypowerclean.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Service Areas",
      "item": "https://www.tampabaypowerclean.com/service-areas/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Clearwater",
      "item": "https://www.tampabaypowerclean.com/service-areas/clearwater/"
    }
  ]
}
</script>
```

---

## ✅ DEPLOYMENT CHECKLIST

**Before deploying schema**:
- [ ] Replace all [PLACEHOLDERS] with actual data
- [ ] Validate JSON-LD syntax (use https://validator.schema.org/)
- [ ] Test in Google Rich Results tester (https://search.google.com/test/rich-results)
- [ ] Ensure all URLs are correct and use HTTPS
- [ ] Add all pages to Google Search Console
- [ ] Monitor for schema errors in GSC

---

## 📱 MOBILE STRUCTURED DATA BEST PRACTICES

- Keep schema markup in `<head>` section (not footer)
- Use JSON-LD format (not microdata or RDFa)
- Validate before going live
- Update schema when content changes
- Include all important details (phone, address, hours, etc.)
- Use consistent formatting across all pages

---

## 🔗 VALIDATION TOOLS

1. **Google Rich Results Tester**: https://search.google.com/test/rich-results
2. **Schema.org Validator**: https://validator.schema.org/
3. **Google Search Console**: https://search.google.com/search-console
4. **Structured Data Testing Tool**: https://developers.google.com/structured-data/testing-tool/

---

## 💾 IMPLEMENTATION ORDER

1. **Week 1**: Homepage schema (Organization, LocalBusiness, WebSite)
2. **Week 1-2**: Service page schema (Service, Offer, Review)
3. **Week 2-3**: Location page schema (LocalBusiness, Breadcrumb)
4. **Week 2-4**: Blog post schema (BlogPosting)
5. **Week 3-4**: FAQ schema (FAQPage)
6. **Week 4+**: HowTo, Video, and supplementary schemas

---

**Schema Library Status**: COMPLETE & READY  
**Validation Required**: Yes (before deployment)  
**Maintenance**: Review quarterly for accuracy

---

**Need help?** Reference:
- Google's Structured Data Documentation: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Schema.org Official Documentation: https://schema.org/
- Our implementation checklist: `/CLIENTS/implementation-checklist.md`
