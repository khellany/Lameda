# LamedaBot — Cron Setup (cron-job.org)

**Scheduler:** [cron-job.org](https://cron-job.org) (external) — chosen because Vercel **Hobby**
caps cron jobs and only triggers them once per day, which is too coarse for cart recovery and
payment expiry.

> The Vercel `crons` block has been **removed** from `vercel.json`. Vercel no longer schedules
> these — cron-job.org is the single source of truth. Do not re-add them, or they will double-fire.

---

## How the endpoints authenticate

Every cron endpoint is a plain `GET` that checks one header:

```
Authorization: Bearer <CRON_SECRET>
```

- `CRON_SECRET` must be set in **Vercel → Project → Settings → Environment Variables**
  (Production scope) **and** pasted into each cron-job.org job's custom header. The two must match.
- The handlers are fail-closed: a missing/wrong secret returns **401** (and a missing env var
  also returns 401 — see VULN-003 in SECURITY.md).
- Generate the secret once: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Jobs to create

Base URL: `https://lameda.vercel.app`
Set each job's **timezone to UTC** (the digest does its own WAT/UTC+1 arithmetic internally, so
trigger times are expressed in UTC). Add the `Authorization` header to **every** job.

| Job title | URL | Schedule (UTC) | cron expr | Why this cadence |
|---|---|---|---|---|
| Cart recovery | `/api/cron/cart-recovery` | every 15 min | `*/15 * * * *` | 15-min + 2-h nudges need frequent runs |
| Payment expiry | `/api/cron/payment-expiry` | every 15 min | `*/15 * * * *` | Cancel/restock expired links promptly |
| Bot health | `/api/cron/bot-health` | daily 06:00 | `0 6 * * *` | Runs before the digest |
| Merchant digest | `/api/cron/merchant-digest` | daily 07:00 | `0 7 * * *` | 07:00 UTC = 08:00 WAT delivery |

---

## Step-by-step (per job) on cron-job.org

1. **Create cronjob** → **Title**: e.g. "Lameda — cart recovery".
2. **URL**: the full endpoint, e.g. `https://lameda.vercel.app/api/cron/cart-recovery`.
3. **Schedule**: choose the cadence above (the UI accepts the listed intervals; advanced mode
   accepts the cron expression). Set **Timezone = UTC**.
4. **Advanced / Headers** → add a request header:
   - Key: `Authorization`
   - Value: `Bearer <your CRON_SECRET value>`   ← include the literal word `Bearer ` here.
5. **Request method**: `GET`.
6. **Save & enable**. Use **Run now** once to confirm a `200` response (`{"ok":true,...}`).
   A `401` means the header/secret doesn't match Vercel's `CRON_SECRET`.

> Note: in the **route code** the secret has no `Bearer ` prefix (the handler strips it). But in
> the cron-job.org **header value** you DO write `Bearer <secret>`, because that's the raw HTTP
> header the handler parses.

---

## Verifying

- cron-job.org shows the last execution status + response per job.
- Vercel runtime logs (`/api/cron/*`) should show `200` at the scheduled times.
- A `401` in logs → secret mismatch or `CRON_SECRET` unset in Vercel (re-check + redeploy after
  setting it).

---

## If you ever move back to Vercel Cron (Pro plan)

Re-add the `crons` array to `vercel.json` (see git history for the prior block) **and disable the
cron-job.org jobs** to avoid double execution. Vercel auto-injects the `Authorization: Bearer
<CRON_SECRET>` header when `CRON_SECRET` is set, so no per-job header config is needed there.
