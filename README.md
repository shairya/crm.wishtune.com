# Wishtune CRM — frontend

Next.js 14 (App Router) + Tailwind admin app for **https://crm.wishtune.com**.
Every page needs a login. The API is the `wishtune-crm-backend` repo, and its
README has the full server setup.

| Page | What's there |
|---|---|
| `/login` | admin sign-in (logins are created with `npm run create-admin` on the backend) |
| `/dashboard` | contacts by stage, buyers, revenue, buyers by focus, top campaigns, latest events |
| `/contacts` | searchable list; filter by stage, paying / free-only / non-buyer, focus, format, product, currency, country, lead source, campaign, consent, unsubscribed, mobile, test contacts (hidden by default); **CSV exports** (filtered list, Meta paying customers, all buyers, buyer exclusion list) |
| `/contacts/[id]` | details (edit first/last name, mobile), all emails/mobiles, purchases in their own currency, bot outreach status, every event, notes, unsubscribe, mark as test |
| `/events` | every incoming event; the **Rejected** tab is the error log |
| `/settings` | Products (MT-001…MT-015, INR/USD prices, Payhip matching), Test contacts (emails / domains / coupons), Imports (history), Integrations (webhook URLs + status), Bots, Account (change password) |

## Run

```bash
cp .env.example .env.local          # NEXT_PUBLIC_API_URL
npm install
npm run dev                         # http://localhost:3100  (backend: CORS_ORIGINS=http://localhost:3100)
npm run build && npm start          # production, 127.0.0.1:3100 behind nginx
```

`NEXT_PUBLIC_API_URL` is baked in at build time, so rebuild after changing it.

## Branding

All colours are CSS variables at the top of `app/globals.css`. Change them
there and the whole app follows. The current palette is a placeholder
(plum / violet / gold). The logo is the text wordmark in `components/ui.tsx`
(`Logo`). To use the real logo, put the file in `public/` and swap the
`<span>` for an `<img>`.
