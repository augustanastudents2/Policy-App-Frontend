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

This is **plain HTML/CSS/JS** — the browser cannot read `.env` or server env vars. There is no Node and no build step.

**Edit `config.js`** at the project root and set `window.API_BASE_URL` to your backend URL. Every page loads `config.js` first, then your app scripts. When the URL changes, update that one line and redeploy.

## Tech stack

- **HTML5** — Semantic structure; admin forms use Quill for rich text
- **CSS3** — Custom styles (no Bootstrap); CSS variables in admin
- **JavaScript (ES6+)** — Fetch API, no build step
- **Quill** — Rich text editor on policy/bylaw forms (loaded from CDN)
- **jsPDF** — Client-side PDF generation on policy detail (from CDN)

## License

Internal use for the Augustana Students' Association. See repo or organization for license details.
