import { h } from "preact";
import type { Heading, Page } from "../core/content.js";
import type { NavItem } from "../core/nav.js";
import { relativeUrl, rootRelativeUrl } from "../core/paths.js";

export type LayoutProps = {
  page: Page;
  nav: NavItem[];
  css: string;
  searchIndexJson: string;
  needsMermaid: boolean;
};

export function Layout({ page, nav, css, searchIndexJson, needsMermaid }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{page.title}</title>
        <link rel="stylesheet" href={rootRelativeUrl(page.route, "assets/lildocs.css")} />
      </head>
      <body>
        <div className="pageShell">
          <header className="siteHeader">
            <a className="brand" href={relativeUrl(page.route, "index.html")}>
              Docs
            </a>
            <div className="searchBox">
              <input
                id="lildocs-search-input"
                type="search"
                placeholder="Search docs"
                aria-label="Search docs"
              />
              <div id="lildocs-search-results" className="searchResults" />
            </div>
          </header>
          <div className="contentGrid">
            <aside className="sidebar">
              <nav aria-label="Documentation navigation">
                <NavList items={nav} currentRoute={page.route} pageRoute={page.route} />
              </nav>
            </aside>
            <main className="content">
              <article dangerouslySetInnerHTML={{ __html: page.html ?? "" }} />
            </main>
            <aside className="toc">
              <Toc headings={page.headings} />
            </aside>
          </div>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.lildocsSearchUrl = ${JSON.stringify(rootRelativeUrl(page.route, "search-index.json"))};`,
          }}
        />
        <script
          type="application/json"
          id="lildocs-search-index"
          dangerouslySetInnerHTML={{ __html: searchIndexJson }}
        />
        <script src={rootRelativeUrl(page.route, "assets/search.js")} />
        {needsMermaid ? (
          <script
            type="module"
            src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs"
          />
        ) : null}
        {needsMermaid ? (
          <script
            type="module"
            dangerouslySetInnerHTML={{
              __html: "mermaid.initialize({ startOnLoad: true });",
            }}
          />
        ) : null}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </body>
    </html>
  );
}

function NavList({
  items,
  currentRoute,
  pageRoute,
}: {
  items: NavItem[];
  currentRoute: string;
  pageRoute: string;
}) {
  return (
    <ul className="navList">
      {items.map((item) => (
        <li>
          <a
            className={item.route === currentRoute ? "active" : undefined}
            href={relativeUrl(pageRoute, navTarget(item))}
          >
            {item.title}
          </a>
          {item.children.length > 0 ? (
            <NavList items={item.children} currentRoute={currentRoute} pageRoute={pageRoute} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function navTarget(item: NavItem): string {
  if (item.children.length === 0) {
    return item.route;
  }

  return item.children[0]?.route ?? item.route;
}

function Toc({ headings }: { headings: Heading[] }) {
  const tocHeadings = headings.filter((heading) => heading.depth > 1 && heading.depth < 4);
  if (tocHeadings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Table of contents">
      <p>On this page</p>
      <ul>
        {tocHeadings.map((heading) => (
          <li className={`tocDepth${heading.depth}`}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
