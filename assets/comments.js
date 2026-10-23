// Loads the Cusdis comment thread only after the reader asks for it.
document.addEventListener("click", (event) => {
  const button = event.target.closest(".comments-load");
  if (!button) return;
  const d = button.dataset;
  const thread = button.parentElement.querySelector(".comments-thread");
  thread.id = "cusdis_thread";
  Object.assign(thread.dataset, { host: d.host, appId: d.appId, pageId: d.pageId, pageUrl: d.pageUrl, pageTitle: d.pageTitle, theme: "light" });
  const script = document.createElement("script");
  script.src = `${d.host}/js/cusdis.es.js`;
  script.async = true;
  document.body.append(script);
  button.remove();
});
