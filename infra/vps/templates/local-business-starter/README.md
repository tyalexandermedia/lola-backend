# Local Business Starter Template

Mobile-first, conversion-focused one-pager for a local service business.
Call-first design (sticky call button), LocalBusiness JSON-LD for local SEO,
zero build step — plain HTML/CSS that Nginx serves directly.

**Don't edit this template for a client.** Scaffold a copy instead:

```bash
lola-new-client <folder-name> <domain>
```

It copies this template into `/opt/lola-cloud/clients/<folder-name>`, asks for
the business details, and fills in every `{{TOKEN}}`:

| Token | Example |
|---|---|
| `{{BUSINESS_NAME}}` | Tampa Bay Power Clean |
| `{{DOMAIN}}` | tampabaypowerclean.com |
| `{{PHONE}}` | +18135550123 (tel: link format) |
| `{{PHONE_DISPLAY}}` | (813) 555-0123 |
| `{{CITY}}` | Tampa |
| `{{SERVICE}}` | Pressure Washing |

After scaffolding: replace the hero placeholder in `style.css` with a real
photo, fill in the three service cards and review quotes with real content,
wire the form's `action` to your lead endpoint, and update the JSON-LD
address block in `index.html`.
