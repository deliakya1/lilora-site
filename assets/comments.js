// Loads the approved comments for this post only after the reader asks for them,
// and reloads them after the reader's own comment is published.
// The comment form itself is handled by navigation.js like the contact form.
const loadComments = async (section) => {
  const button = section.querySelector(".comments-load");
  const list = section.querySelector(".comments-list");
  const d = list.dataset.endpoint ? list.dataset : button.dataset;
  Object.assign(list.dataset, { endpoint: d.endpoint, page: d.page, lang: d.lang, empty: d.empty, error: d.error });
  if (button) button.disabled = true;
  const item = (text, className) => {
    const li = document.createElement("li");
    li.className = className;
    li.textContent = text;
    return li;
  };
  try {
    const response = await fetch(`${d.endpoint}?page=${encodeURIComponent(d.page)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const { comments = [] } = await response.json();
    const date = new Intl.DateTimeFormat(d.lang, { dateStyle: "long" });
    list.replaceChildren(...(comments.length ? comments.map((c) => {
      const li = document.createElement("li");
      li.className = "comment";
      const meta = document.createElement("p");
      meta.className = "comment-meta";
      const name = document.createElement("strong");
      name.textContent = c.name;
      const time = document.createElement("time");
      time.dateTime = c.created_at;
      time.textContent = date.format(new Date(c.created_at));
      meta.append(name, " · ", time);
      const body = document.createElement("p");
      body.className = "comment-body";
      body.textContent = c.message;
      li.append(meta, body);
      return li;
    }) : [item(d.empty, "comments-empty")]));
    if (button) button.remove();
  } catch {
    list.replaceChildren(item(d.error, "comments-empty"));
    if (button) button.disabled = false;
  }
  list.hidden = false;
};
document.addEventListener("click", (event) => {
  const button = event.target.closest(".comments-load");
  if (button) loadComments(button.closest(".comments"));
});
document.addEventListener("comment-published", (event) => {
  const section = event.target.closest(".comments");
  if (section) loadComments(section);
});
