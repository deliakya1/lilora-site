// Loads the approved comments for this post only after the reader asks for them.
// The comment form itself is handled by navigation.js like the contact form.
document.addEventListener("click", async (event) => {
  const button = event.target.closest(".comments-load");
  if (!button) return;
  const d = button.dataset;
  const list = button.parentElement.querySelector(".comments-list");
  button.disabled = true;
  const item = (text, className) => {
    const li = document.createElement("li");
    li.className = className;
    li.textContent = text;
    return li;
  };
  try {
    const response = await fetch(`${d.endpoint}?page=${encodeURIComponent(d.page)}`);
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
    button.remove();
  } catch {
    list.replaceChildren(item(d.error, "comments-empty"));
    button.disabled = false;
  }
  list.hidden = false;
});
