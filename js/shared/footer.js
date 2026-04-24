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
    document.body.appendChild(footer);
  });
})();

