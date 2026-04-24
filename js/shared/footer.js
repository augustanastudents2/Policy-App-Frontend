(() => {
  const year = new Date().getFullYear();
  const appName = window.APP_NAME || "ASA App";

  // Avoid duplicate injection
  if (document.querySelector("[data-asa-footer='1']")) return;

  function initPublicMobileNav() {
    const sidebar = document.querySelector(".sidebar");
    const header = document.querySelector(".main-content .header");
    if (!sidebar || !header) return;

    if (document.querySelector("[data-public-nav-toggle='1']")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mobile-nav-toggle";
    btn.setAttribute("data-public-nav-toggle", "1");
    btn.setAttribute("aria-label", "Open menu");
    btn.innerHTML = `
      <span class="mobile-nav-icon" aria-hidden="true"></span>
    `;

    const overlay = document.createElement("div");
    overlay.className = "mobile-nav-overlay";
    overlay.setAttribute("data-mobile-nav-overlay", "public");

    function close() {
      document.body.classList.remove("public-nav-open");
    }
    function toggle() {
      document.body.classList.toggle("public-nav-open");
    }

    btn.addEventListener("click", toggle);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    header.prepend(btn);
    document.body.appendChild(overlay);
  }

  function initAdminMobileNav() {
    const sidebar = document.querySelector(".admin-sidebar");
    const header = document.querySelector(".admin-header .header-content");
    if (!sidebar || !header) return;

    if (document.querySelector("[data-admin-nav-toggle='1']")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-mobile-nav-toggle";
    btn.setAttribute("data-admin-nav-toggle", "1");
    btn.setAttribute("aria-label", "Open menu");
    btn.innerHTML = `<span class="mobile-nav-icon" aria-hidden="true"></span>`;

    const overlay = document.createElement("div");
    overlay.className = "admin-mobile-nav-overlay";
    overlay.setAttribute("data-mobile-nav-overlay", "admin");

    function close() {
      document.body.classList.remove("admin-nav-open");
    }
    function toggle() {
      document.body.classList.toggle("admin-nav-open");
    }

    btn.addEventListener("click", toggle);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    header.prepend(btn);
    document.body.appendChild(overlay);
  }

  function ensureWakeOverlay() {
    if (document.querySelector("[data-wake-overlay='1']")) return;

    // Load the web component once
    if (!document.querySelector("script[data-dotlottie-wc='1']")) {
      const s = document.createElement("script");
      s.type = "module";
      s.src =
        "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js";
      s.setAttribute("data-dotlottie-wc", "1");
      document.head.appendChild(s);
    }

    const overlay = document.createElement("div");
    overlay.setAttribute("data-wake-overlay", "1");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "4000";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "16px";
    overlay.style.background = "rgba(0,0,0,0.35)";
    overlay.style.backdropFilter = "blur(8px)";
    overlay.style.webkitBackdropFilter = "blur(8px)";

    const card = document.createElement("div");
    card.style.width = "min(520px, 100%)";
    card.style.background = "#fff";
    card.style.border = "1px solid rgba(0,0,0,0.12)";
    card.style.borderRadius = "16px";
    card.style.boxShadow = "0 20px 60px rgba(0,0,0,0.18)";
    card.style.padding = "18px";
    card.style.textAlign = "center";

    card.innerHTML = `
      <dotlottie-wc
        src="https://lottie.host/448d1092-1f19-4cb2-8dd6-a5cd8fd44073/7CzzgIlxIm.lottie"
        style="width: min(320px, 85vw); height: min(320px, 85vw);"
        autoplay
        loop
      ></dotlottie-wc>
      <div style="margin-top:10px;font-size:18px;font-weight:800;color:#111;">
        Waking up the server…
      </div>
      <div style="margin-top:6px;color:#666;font-size:14px;line-height:1.45;">
        Render free tier spins down after inactivity. This can take a few seconds.
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function showWakeOverlay() {
    const el = document.querySelector("[data-wake-overlay='1']");
    if (el) el.style.display = "flex";
  }

  function hideWakeOverlay() {
    const el = document.querySelector("[data-wake-overlay='1']");
    if (el) el.style.display = "none";
  }

  const footer = document.createElement("footer");
  footer.setAttribute("data-asa-footer", "1");
  footer.innerHTML = `
    <p>&copy; ${year} ${appName}.</p>
    <a href="https://linktr.ee/chisomchiobi" target="_blank" rel="noopener noreferrer" class="trademark">
      Built by jasonthe_dev
    </a>
  `;

  // Minimal styling (won't fight existing CSS too much)
  footer.style.padding = "18px 16px";
  footer.style.display = "flex";
  footer.style.gap = "12px";
  footer.style.alignItems = "center";
  footer.style.justifyContent = "center";
  footer.style.flexWrap = "wrap";
  footer.style.width = "100%";
  footer.style.boxSizing = "border-box";
  footer.style.borderTop = "1px solid rgba(0,0,0,0.1)";
  footer.style.color = "#86868b";
  footer.style.fontSize = "14px";
  footer.style.background = "transparent";

  const link = footer.querySelector(".trademark");
  if (link) {
    link.style.color = "#0071e3";
    link.style.fontWeight = "700";
    link.style.textDecoration = "none";
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Ensure footer sits at the bottom, not beside centered content.
    try {
      const bodyStyles = window.getComputedStyle(document.body);
      if (bodyStyles.display !== "flex") {
        document.body.style.display = "flex";
      }
      document.body.style.flexDirection = "column";
      document.body.style.minHeight = "100vh";

      // Make the main page container take remaining height.
      const main =
        document.querySelector(".container") ||
        document.querySelector(".admin-layout") ||
        document.querySelector(".login-container") ||
        document.body.firstElementChild;

      if (main && main !== footer) {
        main.style.flex = "1 0 auto";
      }

      footer.style.marginTop = "auto";
      footer.style.flex = "0 0 auto";
    } catch (e) {
      // ignore
    }

    // Mobile nav (public + admin)
    try {
      initPublicMobileNav();
      initAdminMobileNav();
    } catch (e) {
      // ignore
    }

    // Backend wake overlay + fetch wrapper (Render spin-up)
    try {
      ensureWakeOverlay();

      const originalFetch = window.fetch.bind(window);
      let pending = 0;
      let timer = null;

      function start() {
        pending += 1;
        if (pending === 1) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => showWakeOverlay(), 900);
        }
      }

      function end() {
        pending = Math.max(0, pending - 1);
        if (pending === 0) {
          if (timer) clearTimeout(timer);
          timer = null;
          hideWakeOverlay();
        }
      }

      window.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input?.url || "";
        const isApi =
          (typeof window.API_BASE_URL === "string" &&
            url.startsWith(window.API_BASE_URL)) ||
          url.includes("/api/");

        if (isApi) start();
        try {
          const res = await originalFetch(input, init);
          return res;
        } finally {
          if (isApi) end();
        }
      };
    } catch (e) {
      // ignore
    }
    document.body.appendChild(footer);
  });
})();

