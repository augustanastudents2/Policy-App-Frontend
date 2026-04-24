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

    // Ensure sidebar can pin bottom links on mobile.
    try {
      sidebar.setAttribute("data-mobile-sidebar", "public");

      // Move Admin Login + Contact Us to a bottom container (mobile only via CSS).
      if (!sidebar.querySelector("[data-public-nav-bottom='1']")) {
        const bottom = document.createElement("div");
        bottom.setAttribute("data-public-nav-bottom", "1");
        bottom.className = "mobile-nav-bottom";

        const spacer = document.createElement("div");
        spacer.className = "mobile-nav-spacer";
        spacer.setAttribute("data-public-nav-spacer", "1");

        const adminLink = sidebar.querySelector(".admin-login");
        const contactLink =
          sidebar.querySelector(".contact-link-active") || sidebar.querySelector(".contact-link");

        // Insert spacer near end, then append bottom links
        sidebar.appendChild(spacer);
        if (adminLink) bottom.appendChild(adminLink);
        if (contactLink) bottom.appendChild(contactLink);
        sidebar.appendChild(bottom);
      }

      // Add an explicit close "X" inside the drawer.
      if (!sidebar.querySelector("[data-mobile-nav-close='public']")) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "mobile-nav-close";
        closeBtn.setAttribute("data-mobile-nav-close", "public");
        closeBtn.setAttribute("aria-label", "Close menu");
        closeBtn.innerHTML = "×";
        closeBtn.addEventListener("click", () => {
          document.body.classList.remove("public-nav-open");
        });
        sidebar.prepend(closeBtn);
      }
    } catch {
      // ignore
    }

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

    // Put the logo into the collapsible menu on mobile (hide header logo via CSS).
    try {
      sidebar.setAttribute("data-mobile-sidebar", "admin");
      if (!sidebar.querySelector("[data-admin-mobile-logo='1']")) {
        const headerLogo = document.querySelector(".admin-header .logo");
        if (headerLogo) {
          const clone = headerLogo.cloneNode(true);
          clone.setAttribute("data-admin-mobile-logo", "1");
          clone.classList.add("admin-sidebar-logo");
          sidebar.prepend(clone);
        }
      }

      // Add an explicit close "X" inside the drawer.
      if (!sidebar.querySelector("[data-mobile-nav-close='admin']")) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "admin-mobile-nav-close";
        closeBtn.setAttribute("data-mobile-nav-close", "admin");
        closeBtn.setAttribute("aria-label", "Close menu");
        closeBtn.innerHTML = "×";
        closeBtn.addEventListener("click", () => {
          document.body.classList.remove("admin-nav-open");
        });
        sidebar.prepend(closeBtn);
      }
    } catch {
      // ignore
    }

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
    document.body.appendChild(footer);
  });
})();

