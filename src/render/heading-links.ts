const headingSelector =
  ".content article h1[id], .content article h2[id], .content article h3[id], .content article h4[id], .content article h5[id], .content article h6[id]";

export function initHeadingLinks() {
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

async function copyHeadingLink(heading: HTMLHeadingElement) {
  const url = new URL(window.location.href);
  url.hash = heading.tagName === "H1" ? "" : heading.id;

  try {
    await writeClipboard(url.href);
    heading.classList.add("headingLinkCopied");
    window.setTimeout(
      () => heading.classList.remove("headingLinkCopied"),
      1600,
    );
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
