// Handover form helpers: add plant blocks and print only the form. No storage, no network.
(() => {
  const form = document.querySelector("[data-handover-form]");
  if (!form) return;
  const list = form.querySelector("[data-handover-plants]");
  const actions = form.querySelector(".handover-actions");
  actions.hidden = false;
  form.addEventListener("submit", (event) => event.preventDefault());
  form.querySelector("[data-handover-add]").addEventListener("click", () => {
    const cards = list.querySelectorAll(".handover-plant");
    const n = cards.length + 1;
    const card = cards[cards.length - 1].cloneNode(true);
    card.querySelector("legend").textContent = `${form.dataset.plantLabel} ${n}`;
    card.querySelectorAll("input, textarea").forEach((field) => {
      field.value = "";
      field.name = field.name.replace(/^plant-\d+/, `plant-${n}`);
    });
    list.append(card);
    card.querySelector("input").focus();
  });
  const root = document.documentElement;
  form.querySelector("[data-handover-print]").addEventListener("click", () => {
    root.classList.add("print-handover");
    window.print();
  });
  window.addEventListener("afterprint", () => root.classList.remove("print-handover"));
})();
