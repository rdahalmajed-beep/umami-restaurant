# Deploy storefront to Vercel (linked to hosted Admin/API)

The local Admin + storefront pair is slow on Windows. Deploy the **storefront** to Vercel and point it at a **publicly reachable Medusa backend** (Railway / Render / Fly / Medusa Cloud / tunnel).

## 1. Host the backend first (Render)

Deploy Medusa API + Admin with the Blueprint: **`docs/RENDER_MEDUSA.md`** (`render.yaml`).

Admin and API share one public HTTPS origin, e.g. `https://umami-medusa.onrender.com`.

In Render env for the web service:

```env
STORE_CORS=https://YOUR_APP.vercel.app,http://localhost:8000
ADMIN_CORS=https://umami-medusa.onrender.com
AUTH_CORS=https://umami-medusa.onrender.com,https://YOUR_APP.vercel.app,http://localhost:8000
MEDUSA_BACKEND_URL=https://umami-medusa.onrender.com
```

Seed the real Umami menu (Render Shell on `/server`):

```bash
cd /server
./node_modules/.bin/medusa exec ./src/scripts/seed-restaurant-commerce.ts
./node_modules/.bin/medusa exec ./src/scripts/seed-umami-menu.ts
```

Copy the publishable API key from Admin → Settings → Publishable API Keys (or from seed logs).
## 2. Vercel project

- **Root Directory:** `restaurant-platform` (monorepo) **or** `restaurant-platform/apps/storefront`
- If root is monorepo, use `apps/storefront/vercel.json` or set:
  - Install: `pnpm install --filter @dtc/storefront...`
  - Build: `pnpm --filter @dtc/storefront run build`
- Framework: Next.js

### Environment variables (Vercel → Settings → Env)

| Name | Example |
|------|---------|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://api.your-domain.com` |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_...` |
| `NEXT_PUBLIC_BASE_URL` | `https://YOUR_APP.vercel.app` |
| `NEXT_PUBLIC_DEFAULT_REGION` | `bh` |
| `REVALIDATE_SECRET` | same as backend |

Optional: `RESTAURANT_ALLOW_CATALOG_FALLBACK=true` only for staging while menus are unpublished.

## 3. Local trial without full hosting

Use a tunnel to your local Medusa (`cloudflared` / `ngrok`) as `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, then deploy storefront on Vercel with that URL. Update backend CORS to the Vercel domain.

## 4. What is fast today

Home + `/store` load the **Medusa-backed menu** (`MenuTemplate`: restaurant menu projection, else Medusa categories/products). Cart/checkout use Store API only — no hardcoded catalog.

## 5. After deploy checklist

- [ ] Open Vercel URL on phone — menu loads in &lt;1s
- [ ] Logo + cream/brown/mustard theme visible
- [ ] Backend health: `GET {BACKEND}/health`
- [ ] Publishable key accepted (no CORS / 401 on `/store/products`)
- [ ] Run `seed-umami-menu.ts` so Admin catalog matches storefront
