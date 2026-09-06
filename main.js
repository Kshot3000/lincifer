(function () {
  const cfg = window.LINCIFER || {};
  const ca = document.getElementById("ca");
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  if (ca && cfg.contractAddress) ca.textContent = cfg.contractAddress;

  const setHref = (id, url) => {
    const el = document.getElementById(id);
    if (el && url) el.setAttribute("href", url);
  };
  setHref("cta-pump", cfg.pumpUrl);
  setHref("nav-buy", cfg.pumpUrl);
  setHref("link-pump", cfg.pumpUrl);
  setHref("link-tg", cfg.telegramUrl);

  const btn = document.getElementById("copy-ca");
  if (btn) {
    btn.addEventListener("click", async () => {
      const text = (cfg.contractAddress || "").trim();
      if (!text || text === "COMING SOON") {
        btn.textContent = "No CA yet";
        setTimeout(() => (btn.textContent = "Copy Sigil"), 1200);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Failed";
      }
      setTimeout(() => (btn.textContent = "Copy Sigil"), 1200);
    });
  }
})();
