const headingSelector =
  ".content article h1[id], .content article h2[id], .content article h3[id], .content article h4[id], .content article h5[id], .content article h6[id]";
const headingLinkIcons = {
  link: '<span class="ti ti-link" aria-hidden="true"></span>',
  check: '<span class="ti ti-check" aria-hidden="true"></span>',
};

export function initHeadingLinks() {
  enhanceHeadingLinks();
  document.addEventListener("lildocs:page-view", enhanceHeadingLinks);
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || event.target.closest("a")) {
      return;
    }

    const heading = event.target.closest<HTMLHeadingElement>(headingSelector);
    if (!heading) {
      return;
    }

    void copyHeadingLink(heading);
  });
}

function enhanceHeadingLinks() {
  const headings =
    document.querySelectorAll<HTMLHeadingElement>(headingSelector);

  for (const heading of Array.from(headings)) {
    if (heading.querySelector(".headingLinkIcon")) {
      continue;
    }

    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "headingLinkIcon";
    icon.setAttribute("aria-label", "Copy link to heading");
    icon.title = "Copy link to heading";
    icon.innerHTML = headingLinkIcons.link;
    heading.append(icon);
  }
}

async function copyHeadingLink(heading: HTMLHeadingElement) {
  const url = new URL(window.location.href);
  url.hash = heading.tagName === "H1" ? "" : heading.id;

  try {
    await writeClipboard(url.href);
    const icon = heading.querySelector<HTMLButtonElement>(".headingLinkIcon");
    if (!icon) {
      return;
    }

    icon.classList.add("headingLinkCopied");
    icon.innerHTML = headingLinkIcons.check;
    icon.setAttribute("aria-label", "Copied");
    icon.title = "Copied";
    window.setTimeout(() => {
      icon.classList.remove("headingLinkCopied");
      icon.innerHTML = headingLinkIcons.link;
      icon.setAttribute("aria-label", "Copy link to heading");
      icon.title = "Copy link to heading";
    }, 1600);
  } catch {}
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw new Error("Unable to copy heading link");
  }
}
