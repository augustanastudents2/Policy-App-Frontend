(() => {
  const year = new Date().getFullYear();
  const appName = window.APP_NAME || "ASA App";

  // Avoid duplicate injection
  if (document.querySelector("[data-asa-footer='1']")) return;

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
    document.body.appendChild(footer);
  });
})();

