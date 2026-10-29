// GitHub Pages serves static redirect documents. Preserve visitors' campaign,
// form-status and fragment values; the canonical and no-JS fallback stay clean.
(() => {
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) return;
  const target = new URL(canonical.href, location.href);
  if (target.origin !== location.origin || target.pathname === location.pathname) return;
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
})();
