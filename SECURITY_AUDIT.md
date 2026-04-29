# Security Audit — `603-websites/vixfixpro`

**Auditor:** Senior Security Engineer (automated review)
**Date:** 2026-04-28
**Scope:** Pure static site (HTML / CSS / vanilla JS) deployed on Vercel at `https://vixfixpro.vercel.app`. Forms POST to the Website Upgrader Pro SaaS at `https://www.websiteupgraderpro.com/api/v1/contact` using a publishable API key (`window.WUP_SAAS.apiKey`).
**Branch:** `security-audit/vixfix`

This audit is a static review of the source. No fixes were applied.

---

## Executive Summary

The site has a small, sane attack surface: there is **no own backend**, **no `innerHTML` / `eval` / `document.write`** use anywhere, **no client-side storage** of PII, **no URL-parameter reflection**, and basic security headers are already set in `vercel.json`. PII flows to the SaaS only over HTTPS via `fetch`, with no caching client-side.

The findings below are dominated by *defense-in-depth* gaps, not exploitable bugs. The two that matter most are (1) **no honeypot / abuse signal on the form, paired with the form auto-attaching to *any* `form` containing an email + textarea** — a future form added to the site will silently start spamming the SaaS, and (2) the **CSP / HSTS / Permissions-Policy / frame-ancestors headers are not configured** in `vercel.json`, only the legacy four headers.

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 5 |

---

## Critical

*None.*

---

## High

### H1. `initContactForms` auto-attaches to **every** `<form>` with an `email` input + `textarea` — silent over-binding risk

- **File:** `js/main.js:108-111`
- **Code:**
  ```js
  document.querySelectorAll('form').forEach(form => {
    const emailInput = form.querySelector('input[type="email"]');
    const textarea = form.querySelector('textarea');
    if (!emailInput || !textarea) return; // not a contact form
    ...
  ```
- **Attack scenario / failure mode:** Today, only intended forms qualify. But the moment a future form on this site happens to include both an `<input type="email">` and a `<textarea>` — for example, a "Contact about a job posting" form, a careers application, a support-ticket form on a future client portal page, or even a misconfigured search bar — it will be auto-wired to `POST` to `/api/v1/contact` with the *contractor lead-gen* payload shape. This is a design-time foot-gun that almost guarantees a future bug, and because the SaaS rate-limit budget is per-tenant, an over-bound form silently burns the budget Justin's real leads need.
- **Exact fix:** Switch from "all forms with email + textarea" to **explicit opt-in**. Add `data-wup-contact` on every intentional contact form (hero, contact section, modal, service-area, blog) and replace the selector with `document.querySelectorAll('form[data-wup-contact]')`. This costs one HTML attribute per form and removes the entire class of failure.

---

## Medium

### M1. No honeypot / time-trap field on contact forms

- **Files:** every contact form on the site (homepage hero `index.html:84`, contact section `index.html:325`, modal `index.html:528`, all service-area pages, all blog pages, etc. — 25 forms total)
- **Attack scenario:** Bots that scrape `<form>` elements and POST every field will sail through — there is *no* client-side spam signal. The SaaS-side rate limit + CORS will catch *volume* abuse from one origin, but they do not stop a slow, distributed, dictionary-style spam campaign that stays under the rate limit. Today's lead inbox can be polluted faster than rate-limited.
- **Compare to SaaS:** The SaaS-side rate limit is a backstop, not a filter. A honeypot is the cheapest possible per-form filter and catches ~95% of unsophisticated bots before they hit the rate limiter.
- **Exact fix:** Add a hidden honeypot field to every form, e.g. `<input type="text" name="company_website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" />`. In `js/main.js:118-122`, before assembling `fields`, bail early if `form.querySelector('[name="company_website"]')?.value`. Optionally also record `form.dataset.renderedAt = Date.now()` on first render and reject submissions under ~1.5s — the SaaS will appreciate the cleaner signal.

### M2. `vercel.json` missing CSP, HSTS, Permissions-Policy, and `frame-ancestors`

- **File:** `vercel.json:1-13`
- **Currently set:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Missing:**
  - **`Content-Security-Policy`** — without one, an XSS bug anywhere on the site (or a compromised CDN — see M4) can exfiltrate the API key and post arbitrary leads. A reasonable starting policy:
    ```
    default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net https://plausible.io 'unsafe-inline';
    style-src  'self' https://fonts.googleapis.com https://cdn.jsdelivr.net 'unsafe-inline';
    font-src   'self' https://fonts.gstatic.com;
    img-src    'self' data:;
    connect-src 'self' https://www.websiteupgraderpro.com https://plausible.io;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self' https://www.websiteupgraderpro.com;
    ```
    (`'unsafe-inline'` is required because of the inline `WUP_SAAS` and Plausible-shim scripts in `<head>`. To drop it, move both to `js/wup-init.js` and reference by `src`.)
  - **`Strict-Transport-Security`** — `max-age=63072000; includeSubDomains; preload` ensures SSL-stripping MITM cannot downgrade visitors mid-session.
  - **`Permissions-Policy`** — `camera=(), microphone=(), geolocation=(), payment=(), usb=()` denies powerful APIs the site has no need for.
- **Note:** `X-Frame-Options: DENY` *does* cover click-jacking today; `frame-ancestors 'none'` in CSP is the modern replacement and should be added in tandem.

### M3. Embedded API key residual risk — mitigations rely entirely on the SaaS side

- **Files:** `<head>` of all 24 HTML pages (`index.html:31`, every service-area + blog page, `about.html:31`, `faq.html:30`, etc. — see grep results below).
- **Reality:** The key `wup_q1crKT-...` is publishable by design. This is the same residual-risk model as the spot-detail site:
  - Anyone can read the key from `view-source:`. CORS + rate limit + (eventually) honeypot are the guards.
  - **If CORS on the SaaS endpoint is misconfigured to `*` or to `vixfixpro.vercel.app, *`,** the key becomes usable from any origin and the rate limit becomes the only defense.
  - **If the SaaS rate limit is bucketed per-IP only, not per-tenant-key,** an attacker rotating IPs (residential proxies) can grind through Justin's lead budget cheaply.
- **Action items (to be verified on the SaaS side, not in this repo):**
  1. Confirm `Access-Control-Allow-Origin` for `/api/v1/contact` is the explicit allow-list `https://vixfixpro.vercel.app, https://vixfixpro.com, https://www.vixfixpro.com` — **not** `*`, **not** reflected.
  2. Confirm rate limit is keyed on **(tenant API key, IP)** with sane per-key daily caps regardless of IP.
  3. Confirm the SaaS responds with `Vary: Origin`.
- **Exact fix on this repo:** none until the custom domain ships. When `vixfixpro.com` cuts over, the key should be **rotated** and the CORS allow-list updated atomically.

### M4. Third-party scripts loaded without Subresource Integrity (SRI)

- **Files:**
  - `<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>` — `index.html:516`, `blog.html:242`, `about.html:236`, `projects.html:686`, `service-areas.html:208`, all service-area pages, all blog pages
  - `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />` — same files, line 25
  - `<script defer src="https://plausible.io/js/script.js" ...>` — every page, line 34
- **Attack scenario:** If `cdn.jsdelivr.net` is compromised or DNS-hijacked for any visitor, attacker-controlled JS runs in the page context and can read `window.WUP_SAAS.apiKey`, exfiltrate any lead being typed into the form, or replace the form's `action`. Plausible is a smaller surface but the same class of risk.
- **Exact fix for Swiper (pinned version, SRI feasible):**
  ```html
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/swiper@11.1.14/swiper-bundle.min.css"
        integrity="sha384-..." crossorigin="anonymous" />
  <script src="https://cdn.jsdelivr.net/npm/swiper@11.1.14/swiper-bundle.min.js"
          integrity="sha384-..." crossorigin="anonymous"></script>
  ```
  Pin the exact patch version (today's `swiper@11` floats), generate the SRI hash at build time. Best long-term option: vendor Swiper into `js/vendor/swiper-11.1.14/` and serve from `self` — also lets the CSP drop `cdn.jsdelivr.net`.
- **Plausible:** SRI on `plausible.io/js/script.js` is *not* practical because the script auto-updates. Accept this trade-off; mitigate via CSP `script-src` allow-listing exactly `https://plausible.io` (not the wildcard).

### M5. `vixfixpro.vercel.app` is publicly indexable; `<link rel="canonical">` points to `vixfixpro.com`

- **Files:** `robots.txt:1-4` (`Allow: /` for all UAs), `sitemap.xml:1-152` (lists `vixfixpro.com` URLs), `index.html:8` (`canonical = vixfixpro.com`), every page sets `data-domain="vixfixpro.vercel.app"` on Plausible (`index.html:34`).
- **Issue:** Until the custom domain cuts over, both `vixfixpro.vercel.app` and `vixfixpro.com` are reachable. Search engines may index the staging-style Vercel URL with the same content as the production canonical, causing duplicate-content SEO drag and exposing the API key under *two* origins (which matters when you set the SaaS CORS allow-list).
- **Exact fix:** Add a `vercel.json` redirect from the `*.vercel.app` host to `vixfixpro.com` once the custom domain is live, and add a project-wide `X-Robots-Tag: noindex` header for the `*.vercel.app` host (Vercel exposes this via the `headers` block matched on `host`). Nothing in `sitemap.xml` exposes private data — every URL is a public lead-capture page, which is intentional.

---

## Low

### L1. Inline scripts in `<head>` force `'unsafe-inline'` in any future CSP

- **Files:** every page, lines 28-35 (the `WUP_SAAS` config and the Plausible queue shim).
- **Fix:** Move both to `js/wup-init.js` (loaded before `js/main.js`). Lets a future CSP drop `'unsafe-inline'` from `script-src`.

### L2. `netlify` attribute on every `<form>` is dead code, but slightly increases attack surface for confusion

- **Files:** all 25 forms (e.g. `index.html:84,325,528`, every service-area page line ~234, every blog page).
- **Risk:** Cosmetic only — Vercel ignores it. But if the site is ever moved back to Netlify (or someone clones this template thinking it's wired up), forms will silently double-post (Netlify capture *and* the SaaS POST). Strip the attribute on the next pass to remove ambiguity.

### L3. Success message in `js/main.js:144-148` correctly uses `textContent` — verified safe, no action

- **File:** `js/main.js:144-148`
- **Note:** I'm flagging this as a *positive* finding pinned to the Low list per the audit template. The replaced "Thanks!" wrapper uses `document.createElement` + `wrap.textContent = '...'` and `form.replaceWith(wrap)` — no `innerHTML`, no string interpolation of user input. Cannot be XSS'd. Inline `style.cssText` is a hard-coded string, not user data. **Keep this pattern.**

### L4. `lightboxImg.src = src` from event-delegated `.project-img img, .before-after-img img` clicks (`js/main.js:167-184`)

- **File:** `js/main.js:167`
- **Risk:** All `<img>` elements in `.project-img` / `.before-after-img` are author-controlled, hard-coded in HTML; no user upload exists on this site. *Today* this is fine. If a future feature ever lets a visitor upload or supply an image URL that ends up in those classes, this becomes a `javascript:` / `data:` URL vector via `lightboxImg.src`. Defensive fix: validate `src.startsWith('/')` or strict allow-list of origins before assigning.

### L5. `alert(...)` on submit failure (`js/main.js:151`) leaks abusable UX surface

- **File:** `js/main.js:151`
- **Risk:** Tiny — `alert('Something went wrong sending that. Please try again or call us directly.')` is a hard-coded string, no XSS. But on slow/blocked networks an attacker controlling network conditions can fire alerts repeatedly, which is annoying. Replace with an inline error `<div>` rendered like the success message — same pattern, better UX, removes the modal-blocker.

---

## What's done right

These are findings I *expected* to file and didn't, because they're already handled. Worth noting so they don't regress.

- **No `innerHTML` / `outerHTML` / `document.write` / `eval` / `new Function` anywhere** in the codebase. Grepped `js/main.js` and every `.html`. Only one HTML mutation path exists (`form.replaceWith(wrap)` with `textContent` only) and it's safe — see L3.
- **No URL-parameter reflection.** No `location.search`, `location.hash`, `URLSearchParams`, or `window.location` read anywhere.
- **No client-side storage of PII.** No `localStorage`, `sessionStorage`, or `document.cookie` used. Form data is `fetch`ed and forgotten.
- **All `target="_blank"` links carry `rel="noopener noreferrer"`** — verified across every footer Facebook link and the Google review link in `reviews.html:151`. No reverse-tabnabbing.
- **All external resources are HTTPS** — no mixed content. Grepped for `http://` outside of schema.org / w3.org namespaces.
- **`fetch` posts to the SaaS over HTTPS only** with `Content-Type: application/json` and the `x-api-key` header — no `mode: 'no-cors'` shenanigans.
- **`X-Frame-Options: DENY` is set** in `vercel.json:7`, so click-jacking is closed today (M2 still recommends adding `frame-ancestors 'none'` in CSP for parity with modern browsers).
- **`Referrer-Policy: strict-origin-when-cross-origin`** is set — outbound clicks don't leak the visitor's full URL.
- **Form validation is HTML-native** (`required`, `type="email"`, `type="tel"`) — no custom JS validation that could be bypassed to inject odd payloads into the SaaS.
- **No `package.json` / no `node_modules` / no build step** — supply-chain surface is just the two CDNs (jsdelivr + plausible), addressed in M4.
- **Modal focus trap is implemented** (`js/main.js:75-83`) — accessibility win, also prevents focus-redirect attacks against keyboard users.

---

## Top 3 fixes, ranked

1. **H1** — Switch `initContactForms` to opt-in via `data-wup-contact` (one-line JS change + one attribute per form).
2. **M1** — Add the honeypot field + early-bail in `js/main.js`.
3. **M2** — Land a baseline CSP + HSTS + Permissions-Policy in `vercel.json`. Pairs naturally with **M4** (pin Swiper version + add SRI) since both shrink the same threat surface.
