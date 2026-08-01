# What you must add yourself (required for production)

The platform code is ready for local/staging trials. These items cannot be invented in code without your business decisions and secrets.

## Required before real customers

1. **Payment gateway (Bahrain)**  
   Choose Benefit / Tap / Stripe Middle East / etc., create a sandbox account, and give API keys + webhook secret. Until then checkout uses Medusa `pp_system_default` (dev only).

2. **Publishable API key**  
   In Admin → Settings → Publishable API Keys, copy the key into `apps/storefront/.env.local`:  
   `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...`

3. **Secrets (never commit)** in `apps/backend/.env`:  
   - `JWT_SECRET`, `COOKIE_SECRET`, `AUTH_MFA_ENCRYPTION_KEY`  
   - `RESTAURANT_GUEST_STATUS_SECRET` (guest order status HMAC)  
   - `REVALIDATE_SECRET` + `STOREFRONT_REVALIDATE_URL=http://localhost:8000/api/revalidate`  
   Same `REVALIDATE_SECRET` in `apps/storefront/.env.local`.

4. **Real Postgres** (Neon or managed) with backups — not only local Docker for production.

5. **Email/SMS (optional but needed for real notifications)**  
   Set `NOTIFICATION_WEBHOOK_URL` to your notifier (Resend/Twilio webhook receiver, Make.com, n8n, etc.).  
   Without it the outbox job only logs and marks messages `sent` (stub).

6. **Hosting choice**  
   Medusa Cloud **or** self-hosted with Redis (events/locks/cache/workflows). Multi-instance kitchen SSE needs Redis (today: in-memory).  
   **Render (API + Admin):** see `docs/RENDER_MEDUSA.md` (`render.yaml` Blueprint).  
   **Vercel (storefront):** see `docs/VERCEL_STOREFRONT.md` — point `NEXT_PUBLIC_MEDUSA_BACKEND_URL` at the Render URL.

7. **Staff roles** (optional)  
   Set user metadata `restaurant_role` to one of: `owner` | `manager` | `kitchen` | `cashier` | `content_editor`.  
   Default without metadata = `owner`.

8. **CORS / domains**  
   Update `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` and storefront `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_MEDUSA_BACKEND_URL` for production domains.

9. **Brand assets**  
   Logo/hero image URLs via Admin → Restaurant → Brand content (or upload to your file host / S3 later).

10. **Shipping fees**  
    Policy `flat_fee` is informational for min/ETA/pause; actual delivery prices still come from Medusa Shipping Options (seed or Admin Fulfillment). Align option prices with your policy numbers.
