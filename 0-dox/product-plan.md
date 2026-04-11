# Publix Product Plan

**Domain:** publix.dk
**Model:** Hosted breach notification service — results delivered only to the queried email address

---

## Product Concept

Users enter their email address. The system searches breach databases and sends a report **only to that email address**. This proves ownership of the address and is legally sound under GDPR.

There are two tiers:
- **Free:** Basic breach check using free/open data sources
- **Paid:** Full report with deep coverage, stealer logs, dark web sources

---

## Target Users

- Private individuals checking their own exposure
- Corporates checking their domain (report sent to verified domain admin)
- IT/security teams monitoring their organisation

---

## Legal Framework (Denmark / GDPR)

### Why the email-delivery model is legally defensible
- Results are sent **only to the queried address** — this proves ownership
- The data subject is the one requesting their own data
- This is the model explicitly endorsed by HaveIBeenPwned's terms for notification services
- Lawful basis: **Legitimate interest** — helping people discover their own exposure

### Hard rules to follow
- Never expose plaintext passwords in the UI or email
- Show that an exposure exists; redact or hash the actual password
- Do not cache or store raw breach records beyond what each API license permits
- Honour right to erasure requests
- Have a Data Processing Agreement ready for corporate customers (you become their data processor)
- Comply with Danish Datatilsynet requirements for any service handling PII

---

## Data Sources

### Free Tier Sources

| Source | Cost | Coverage | Requirement |
|--------|------|----------|-------------|
| XposedOrNot | Free | Good, transparent breach sourcing | No auth needed for email checks |
| LeakCheck Public API | Free | Large credential database | "Powered by LeakCheck" attribution |
| HIBP Pwned Passwords | Free | 1B+ password hashes | k-anonymity model — no raw passwords |

### Paid Tier Sources

| Source | Cost | Coverage | Notes |
|--------|------|----------|-------|
| HIBP Pro | ~$3.25–$150+/mo (tiered) | 14B+ records, stealer logs | Explicitly allows notification services; "Powered by HIBP" branding |
| IntelligenceX (IntelX) | €2,500+/yr | Extremely broad: dark web, Tor, leaks, Usenet | Already integrated in codebase |
| Dehashed | $3/100 credits (pay-as-you-go) | Broad field search: email, username, IP, hash | Good for deep one-off lookups in paid tier |

### Sources to Avoid
- COMB, Collection #1, and similar aggregated dumps: redistributing stolen data violates GDPR and likely CFAA — do not use
- Any dataset without a clear commercial license

---

## Tier Design

### Free Tier
- Enter email → system checks XposedOrNot + LeakCheck + HIBP Pwned Passwords
- Email sent to queried address: "Your email appeared in X breaches"
- Limited detail: breach names and dates only, no password info
- Rate limited per email address per day

### Paid Tier (Personal)
- Full report: which breaches, sources, dates, password exposure indicators (hashed/redacted)
- IntelX deep search: dark web, stealer logs
- Ongoing monitoring: alert when email appears in new data
- History of previous reports

### Paid Tier (Business / Domain)
- Domain-wide scan: all `@yourdomain.com` addresses
- Ownership verified via DNS TXT record or email to `admin@`/`security@` address
- Summary report to verified admin
- Bulk CSV export for IT teams
- Webhook alerts for new exposures

---

## Business Model (To Be Defined)

Options to consider:
- **Pay-per-report:** One-time payment for a full report
- **Subscription:** Monthly/annual for ongoing monitoring + alerts
- **Business plan:** Per-domain or per-seat pricing for corporate customers
- **Freemium:** Free basic check, paid upgrade for full detail

---

## Current Codebase State (~75% complete as of Nov 2025)

### What exists and works
- Next.js 13 (TypeScript) + Neo4j (Docker) + Material-UI
- Core CRUD operations and search API with filtering/sorting
- IntelX API integration (sync + proxy search) — already built
- CSV/JSON export
- Basic NextAuth authentication (setup, not enforced)
- Health endpoint, API docs page
- Neo4j schema with AES-256-GCM encryption

### What needs to be built
1. **Route protection** — auth exists but no routes are gated (critical)
2. **Email delivery flow** — search triggers email to queried address, not browser response
3. **Dashboard aggregation queries** — currently shows all zeros
4. **User management UI** — no way to create/manage users
5. **Payment integration** — nothing exists (Stripe or similar)
6. **Multi-tenancy / plan tracking** — no concept of per-user quotas or tiers
7. **Audit logging** — who searched what, when
8. **Rate limiting** — on auth and search routes
9. **Free tier API integrations** — XposedOrNot, LeakCheck (IntelX already done)
10. **SSL + Nginx reverse proxy** — for production deployment
11. **Backup restore** — backup endpoint exists, restore does not
12. **Test coverage** — zero tests currently
13. **Graph visualization** — page exists, library not integrated
14. **Dark mode toggle** — theme infrastructure exists, toggle missing
15. **Bulk operations UI** — API exists, no frontend

### Priority order for going live
1. Route protection + auth enforcement
2. Email delivery flow (core product mechanic)
3. Free tier API integrations (XposedOrNot, LeakCheck)
4. Rate limiting + environment hardening
5. Nginx + SSL + production Docker config
6. Payment integration (Stripe)
7. Plan/quota tracking per user
8. User management UI
9. Dashboard real data
10. Audit logging
11. Tests (unit + integration)

---

## Tech Stack (Current)

- **Frontend/Backend:** Next.js 13.5 (Pages Router), TypeScript
- **UI:** Material-UI (MUI) 5
- **Auth:** NextAuth.js 4
- **Database:** Neo4j 5.26 (Community, Docker)
- **Encryption:** AES-256-GCM (Node.js crypto)
- **Validation:** Zod
- **Charts:** Recharts
- **HTTP:** Axios

## Tech Stack (Additions Needed for Production)

- **Payment:** Stripe
- **Email delivery:** SendGrid / Resend / Postmark
- **Reverse proxy:** Nginx
- **Monitoring:** Sentry (error tracking)
- **Logging:** Pino or Winston (replace console.log)

---

## Attribution Requirements

| Source | Required Attribution |
|--------|---------------------|
| LeakCheck | "Powered by LeakCheck" |
| HIBP | "Powered by HaveIBeenPwned" |
| XposedOrNot | Check current terms |
| IntelX | Per license agreement |

---

*Last updated: 2026-04-07*
