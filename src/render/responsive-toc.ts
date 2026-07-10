const mobileQuery = window.matchMedia("(max-width: 860px)");

export function initResponsiveToc() {
  mobileQuery.addEventListener("change", placeToc);
  document.addEventListener("lildocs:page-view", placeToc);
  placeToc();
}

function placeToc() {
  const contentGrid = document.querySelector("#swup.contentGrid");
  const articleContent = contentGrid?.querySelector(".content article > div");
  const toc = contentGrid?.querySelector<HTMLElement>(".toc");
  if (!contentGrid || !articleContent || !toc) {
    return;
  }

  if (!mobileQuery.matches) {
    contentGrid.append(toc);
    return;
  }

  const heading = Array.from(articleContent.children).find(
    (child) => child.tagName === "H1",
  );
  if (!heading) {
    return;
  }

  const insertionTarget =
    heading.nextElementSibling?.tagName === "BLOCKQUOTE"
      ? heading.nextElementSibling
      : heading;
  insertionTarget.insertAdjacentElement("afterend", toc);
}
