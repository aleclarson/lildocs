import { h } from "preact";
import type { Heading, Page } from "../core/content.js";
import type { ResolvedLogo } from "../core/logo.js";
import type { NavItem } from "../core/nav.js";
import { relativeUrl, rootRelativeUrl } from "../core/paths.js";
import type { PageNavigation } from "./renderPage.js";

export type LayoutProps = {
  page: Page;
  nav: NavItem[];
  pageNavigation?: PageNavigation;
  css: string;
  searchIndexJson: string;
  logo: ResolvedLogo;
  repositoryUrl?: string;
  dev?: {
    clientScriptPath: string;
  };
};

export function Layout({
  page,
  nav,
  pageNavigation,
  css,
  searchIndexJson,
  logo,
  repositoryUrl,
  dev,
}: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{page.title}</title>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,0,0&display=block"
        />
        <link rel="stylesheet" href={rootRelativeUrl(page.route, "assets/lildocs.css")} />
      </head>
      <body>
        <div className="pageShell">
          <header className="siteHeader">
            <a className="brand" href={relativeUrl(page.route, "index.html")}>
              {logo.image ? (
                <img className="brandLogo" src={logoSrc(page.route, logo.image)} alt="" />
              ) : null}
              <span>{logo.text}</span>
            </a>
            <div className="headerActions">
              {repositoryUrl ? (
                <a
                  className="repoButton"
                  href={repositoryUrl}
                  aria-label="View repository on GitHub"
                  title="View repository on GitHub"
                >
                  <span className="material-symbols-rounded" aria-hidden="true">
                    github
                  </span>
                </a>
              ) : null}
              <div className="searchBox">
                <span className="searchIcon material-symbols-rounded" aria-hidden="true">
                  search
                </span>
                <input
                  id="lildocs-search-input"
                  type="search"
                  placeholder="Search docs"
                  aria-label="Search docs"
                />
                <div id="lildocs-search-results" className="searchResults" />
              </div>
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
              <PageNav pageNavigation={pageNavigation} />
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
        {dev ? <script type="module" src={dev.clientScriptPath} /> : null}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </body>
    </html>
  );
}

function logoSrc(pageRoute: string, image: string) {
  if (/^(?:[a-z]+:)?\/\//i.test(image) || image.startsWith("data:") || image.startsWith("/")) {
    return image;
  }

  return rootRelativeUrl(pageRoute, image);
}

function PageNav({ pageNavigation }: { pageNavigation?: PageNavigation }) {
  if (!pageNavigation?.previous && !pageNavigation?.next) {
    return null;
  }

  return (
    <nav className="pageNav" aria-label="Page navigation">
      {pageNavigation.previous ? (
        <a className="pageNavLink pageNavPrevious" rel="prev" href={pageNavigation.previous.href}>
          <span>Previous</span>
          {pageNavigation.previous.title}
        </a>
      ) : (
        <span />
      )}
      {pageNavigation.next ? (
        <a className="pageNavLink pageNavNext" rel="next" href={pageNavigation.next.href}>
          <span>Next</span>
          {pageNavigation.next.title}
        </a>
      ) : null}
    </nav>
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
          {item.children.length > 0 ? (
            <span className="navFolder">{item.title}</span>
          ) : (
            <a
              className={item.route === currentRoute ? "active" : undefined}
              href={relativeUrl(pageRoute, item.route)}
            >
              {item.title}
            </a>
          )}
          {item.children.length > 0 ? (
            <NavList items={item.children} currentRoute={currentRoute} pageRoute={pageRoute} />
          ) : null}
        </li>
      ))}
    </ul>
  );
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
