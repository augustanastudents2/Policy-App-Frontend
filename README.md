# ASA Policy App Frontend

Frontend for the **Augustana Students' Association (ASA) Policy App** — a web app for viewing and managing ASA policies and bylaws. Built with vanilla HTML, CSS, and JavaScript; no framework required.

## Features

### Public (student-facing)
- **Active Policies** — Browse approved policies by section, search, and open policy details with PDF download
- **Bylaws** — View approved bylaws and download the full bylaws PDF
- **Student Suggestion** — Submit suggestions tied to a policy (UAlberta email)
- **Contact** — ASA website, email, phone, location, and office hours

### Admin
- **Login** — Email/password authentication
- **Dashboard** — Policies and bylaws management, approvals, and member/review summary
- **Policies & Bylaws** — Create, edit, view, and delete; rich text (Quill) for content
- **Approvals** — Approve or disapprove pending policies and bylaws
- **Suggestions** — View and manage student suggestions
- **Profile** — User profile panel (sidebar)

## Project structure

```
├── public/                 # Public pages (open in browser from here or via server)
│   ├── policies.html       # Active policies list
│   ├── policy-detail.html  # Single policy view + PDF
│   ├── bylaws.html
│   ├── bylaw-detail.html
│   ├── suggestions.html
│   └── contact.html
├── admin/                  # Admin panel (login, dashboard, CRUD, approvals)
│   ├── login.html
│   ├── dashboard.html
│   ├── master-dashboard.html
│   ├── policies.html, policy-view.html, policy-form.html
│   ├── bylaw.html, bylaw-view.html, bylaw-form.html
│   ├── approvals.html
│   └── suggestions-manage.html
├── config.js                # API URL — edit this when your backend changes
├── css/
│   ├── style.css           # Public site styles
│   └── admin.css           # Admin panel styles
├── js/
│   ├── public/             # Scripts for public pages
│   │   ├── policies.js
│   │   ├── bylaws.js
│   │   ├── suggestions.js
│   │   └── app.js
│   └── admin/              # Scripts for admin pages
│       ├── login.js, admin.js, profile.js
│       ├── policies.js, bylaws.js, approvals.js
│       ├── createPolicy.js, createBylaw.js, viewPolicy.js, viewBylaw.js
│       ├── deletePolicy.js, deleteBylaw.js
│       ├── approvePolicy.js, approveBylaw.js, disapprovePolicy.js, disapproveBylaw.js
│       ├── suggestions.js, deleteSuggestion.js
│       └── master-dashboard.js
└── assets/                 # Images (e.g. asalogo.png), PDFs
```

## Running locally

1. **Clone the repo** (if needed), then **serve from the project root** so paths like `../css/`, `../js/`, `../config.js` work.
   - **Python:** `python3 -m http.server 8000` → open `http://localhost:8000/public/policies.html` and `http://localhost:8000/admin/login.html`
   - **Node:** `npx serve .` → use the URL shown

2. **Admin back link:** From admin pages, “Back to Policies” points to `../public/policies.html`.

## API URL

This is **plain HTML/CSS/JS** — the browser cannot read `.env` or server env vars. There is no framework build step for the public/admin pages.

The API base URL is configured at the top of each JS file as:

- `const API_BASE_URL = window.API_BASE_URL || "<backend url>"`

If you want to override the backend URL without editing JS files, set it in `config.js`:

- `window.API_BASE_URL = "https://your-backend-host.onrender.com"`

## Vercel serverless API routes (env vars)

This repo includes small Vercel serverless functions under `api/` used by the **admin master dashboard**:

- `GET /api/generate-password?length=16` → uses API Ninjas password generator
- `GET /api/emailjs-config` → returns EmailJS public identifiers to the browser

Set these environment variables in **Vercel** (Project Settings → Environment Variables):

```env
# API Ninjas (server-side; safe from being exposed in browser)
API_NINJAS_KEY=<api-ninjas-key>

# EmailJS public identifiers (safe to expose)
EMAILJS_PUBLIC_KEY=<emailjs-public-key>
EMAILJS_SERVICE_ID=<emailjs-service-id>
EMAILJS_TEMPLATE_ID=<emailjs-template-id>
```

## Render spin-up overlay

Render free-tier backends can take a few seconds to “wake up”. This frontend shows a Lottie overlay during slow API calls.

Implemented in:
- `js/shared/footer.js` (wraps `fetch()` and shows overlay after ~0.9s)

## Footer

A footer is injected on every page with the current year and a “Built by” link:

- `js/shared/footer.js`

## Repo setup checklist

### Local dev

- [ ] Serve the folder from the repo root (so absolute paths like `/css/...` work)
  - Python: `python3 -m http.server 8000`
  - Open:
    - `http://localhost:8000/public/policies.html`
    - `http://localhost:8000/admin/login.html`
- [ ] Confirm `config.js` points to the correct backend:
  - `window.API_BASE_URL = "https://<your-backend-host>"`

### Vercel (deployment)

This repo is mostly static HTML/CSS/JS, but it includes Vercel serverless functions under `api/`.

- [ ] Set Vercel env vars:
  - `API_NINJAS_KEY` (server-side)
  - `EMAILJS_PUBLIC_KEY` (public id)
  - `EMAILJS_SERVICE_ID` (public id)
  - `EMAILJS_TEMPLATE_ID` (public id)
- [ ] Update `config.js` to your deployed backend URL (or set `window.API_BASE_URL` before scripts load)
- [ ] Smoke test:
  - Public pages load policies/bylaws
  - Admin login works
  - Master dashboard can create a user (password auto-generated + EmailJS email)
  - Render spin-up overlay appears on cold start

## Tech stack

- **HTML5** — Semantic structure; admin forms use Quill for rich text
- **CSS3** — Custom styles (no Bootstrap); CSS variables in admin
- **JavaScript (ES6+)** — Fetch API, no build step
- **Quill** — Rich text editor on policy/bylaw forms (loaded from CDN)
- **jsPDF** — Client-side PDF generation on policy detail (from CDN)

## License

Internal use for the Augustana Students' Association. See repo or organization for license details.
