// Plant finder: matches three answers against the page's plant data. No storage, no network.
(() => {
  const root = document.querySelector("[data-plant-finder]");
  if (!root) return;
  const { plants, copy } = JSON.parse(root.querySelector("[data-finder-data]").textContent);
  const form = root.querySelector("[data-finder-form]");
  const results = root.querySelector("[data-finder-results]");
  const list = root.querySelector("[data-finder-list]");
  const noMatch = root.querySelector("[data-finder-no-match]");
  root.querySelector("[data-finder-fallback]").hidden = true;
  form.hidden = false;
  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };
  // Pets "yes" is a hard filter: plants not listed non-toxic are never shown, even as fallback.
  const pick = ({ light, level, pets }) => {
    const pool = pets === "yes" ? plants.filter((p) => p.tags.includes("petNonToxic")) : plants;
    const matches = pool.filter((p) => p.light.includes(light));
    const ranked = [...(matches.length ? matches : pool)];
    if (level === "new") ranked.sort((a, b) => b.tags.includes("beginner") - a.tags.includes("beginner"));
    return { exact: matches.length > 0, shown: ranked.slice(0, 3) };
  };
  const card = (p, level) => {
    const row = (label, value, source) =>
      el("div", {}, el("dt", { textContent: label }), el("dd", { textContent: value + (source ? " " : "") }, ...(source ? [el("a", { href: source, textContent: "ASPCA" })] : [])));
    return el(
      "li",
      { className: "finder-card" },
      el("img", { src: p.image, width: p.width, height: p.height, alt: p.alt, loading: "lazy", decoding: "async" }),
      el(
        "div",
        { className: "finder-card-body" },
        el("h3", {}, el("a", { href: p.path, textContent: p.title })),
        el("p", { className: "finder-botanical" }, el("em", { textContent: p.botanical })),
        el("dl", {}, row(copy.why.light, p.glance.light), row(copy.why.care, p.glance.care), row(copy.why.pets, p.glance.pets, p.glance.source)),
        ...(level === "new" && !p.tags.includes("beginner") ? [el("p", { className: "finder-harder", textContent: copy.harder })] : []),
        el("a", { className: "finder-guide", href: p.path, textContent: copy.guide }),
      ),
    );
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = Object.fromEntries(new FormData(form));
    const { exact, shown } = pick(answers);
    noMatch.hidden = exact;
    list.replaceChildren(...shown.map((p) => card(p, answers.level)));
    results.hidden = false;
    results.querySelector("h2").focus();
  });
})();
