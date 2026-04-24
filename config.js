// Client-side config (safe to expose in browser).
// - API_BASE_URL points to your backend
// - EmailJS config uses public identifiers (NOT secrets)
window.API_BASE_URL = window.API_BASE_URL || "https://policy-app-backend.onrender.com";

// Optional local override for EmailJS (normally loaded from `/api/emailjs-config` on Vercel)
window.EMAILJS = window.EMAILJS || {};

