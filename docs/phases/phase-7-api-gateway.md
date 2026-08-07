# Phase 7 — API gateway (api.coloradosun.com)

**Goal**: stand up a small, generic, public HTTP router service at
`api.coloradosun.com` on Google Cloud Run, reachable via a plain CNAME added
at Network Solutions, protected by a shared-secret header, with one route
wired (`reddit-rss` → n8n) and a routing design that lets future org projects
add a route without re-architecting. `api.coloradosun.com` (not
`data.coloradosun.com`) is chosen deliberately because this is meant to grow
into the org's general-purpose public API surface, not stay Reddit-specific.

**Prerequisites**: Phase 0 (n8n webhook URL), a Google Cloud account/project
with billing enabled, Network Solutions access to `coloradosun.com` DNS, and
Google Search Console access (needed for Cloud Run domain-mapping ownership
verification).

## Decisions locked in

- **Hosting**: Google Cloud Run, not Cloudflare Workers — avoids delegating
  any part of `coloradosun.com` DNS to a provider other than Network
  Solutions, and matches how other public-facing org APIs are already hosted.
- **Domain**: `api.coloradosun.com`.
- **DNS mechanism**: a single CNAME record at Network Solutions — no NS
  delegation, no zone transfer.
- **Routing shape**: generic path-based router (`POST /route/:name`) from
  day one, with a config-driven name → destination mapping, so adding a
  second project later is a config change, not a redesign.
- **Auth**: a static shared-secret header (`X-Gateway-Secret`) checked by the
  router before it forwards anything. Cloud Run itself is deployed
  `--allow-unauthenticated` because Devvit's `fetch()` cannot mint a GCP
  identity token — the app-layer secret is the only gate.
- **Repo**: a new standalone service (e.g. `coloradosun-api-gateway`), not
  folded into this Reddit-App repo, since it's meant to outlive and outgrow
  this one integration. Confirmed.

## Steps

1. Enable the needed APIs on the GCP project:
   ```bash
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
   ```
2. Scaffold a new minimal Node/TypeScript service (its own repo, e.g.
   `coloradosun-api-gateway`) with:
   - A routing config (env- or JSON-backed): `{ "reddit-rss": { "url": "<n8n webhook URL>" } }`.
   - `POST /route/:name` handler: reject with `401` if `X-Gateway-Secret`
     is missing or doesn't match `GATEWAY_SHARED_SECRET`; reject with `404`
     if `:name` isn't in the routing config; otherwise forward the request
     body as-is to the configured destination URL and return
     `{ok, status}` from the upstream response (don't relay the upstream
     body back — keep the response surface minimal).
   - `GET /health` → `200` for uptime checks. (Not `/healthz` — that exact
     path is intercepted by Cloud Run's shared edge infrastructure before
     it reaches the container and always 404s regardless of app code;
     confirmed during implementation.)
   - One structured JSON log line per request (route, upstream status,
     latency) to stdout — Cloud Run ships stdout to Cloud Logging
     automatically, no extra wiring needed.
3. Add a minimal `Dockerfile` pinning the Node version (source-based Cloud
   Run deploys work too, but a Dockerfile keeps the runtime version explicit).
4. Put secrets in Secret Manager, not plain env vars — the shared secret and
   the n8n destination URL both qualify:
   ```bash
   gcloud secrets create gateway-shared-secret --data-file=-
   gcloud secrets create route-reddit-rss-url --data-file=-
   gcloud run deploy api-gateway --source . --region=us-central1 \
     --allow-unauthenticated \
     --set-secrets=GATEWAY_SHARED_SECRET=gateway-shared-secret:latest,ROUTE_REDDIT_RSS_URL=route-reddit-rss-url:latest
   ```
5. Verify domain ownership of `coloradosun.com` in Google Search Console —
   Cloud Run domain mappings require this even when mapping a subdomain. Add
   the TXT record Search Console gives you at Network Solutions and wait for
   it to confirm verified.
6. Create the Cloud Run domain mapping:
   ```bash
   gcloud run domain-mappings create --service=api-gateway \
     --domain=api.coloradosun.com --region=us-central1
   ```
   This command prints the exact DNS record to add (typically a CNAME to
   `ghs.googlehosted.com`) — use that literal value, don't assume it.
7. In the Network Solutions DNS manager for `coloradosun.com`, add: Host
   `api`, Type `CNAME`, Value = exactly what step 6 printed, TTL default/1hr.
8. Wait for DNS propagation and Google-managed TLS certificate issuance
   (`gcloud run domain-mappings describe --domain=api.coloradosun.com` shows
   certificate status; can take minutes up to ~24h).
9. Smoke test end-to-end:
   ```bash
   curl -i -X POST https://api.coloradosun.com/route/reddit-rss \
     -H "X-Gateway-Secret: $SECRET" -H "Content-Type: application/json" \
     -d '{"event":"post.created","title":"test"}'
   ```
   Confirm `200` and that the test payload shows up in n8n's execution log.
10. Confirm the negative cases too: wrong/missing secret → `401`; unknown
    route name → `404`. Both matter later for diagnosing a misconfigured
    Devvit install vs. a gateway problem.

## Acceptance criteria

- `https://api.coloradosun.com/health` returns `200` with a valid TLS
  certificate (no browser warning).
- `POST /route/reddit-rss` with the correct secret forwards to n8n and
  returns `200`; wrong secret → `401`; unknown route → `404`.
- Adding a second route (a future project) requires only a new config/secret
  entry plus a redeploy — no handler code changes.

## Troubleshooting

- Domain mapping stuck in "Certificate provisioning" → DNS likely hasn't
  propagated yet; check with `dig api.coloradosun.com CNAME` from a shell
  that isn't using a stale local resolver cache.
- "Domain ownership not verified" on `domain-mappings create` → the Search
  Console TXT record (step 5) wasn't completed, or hasn't propagated yet.
- `403` from Cloud Run before your code even runs → redeployed without
  `--allow-unauthenticated`.

## Hand-off to Phase 8

With the gateway live and smoke-tested, Phase 8 rewires the Devvit app to
send pared-back notifications here instead of directly to n8n.
