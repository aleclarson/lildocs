import { h } from "preact";
import type { Heading, Page } from "../core/content.js";
import type { ResolvedLogo } from "../core/logo.js";
import type { NavItem } from "../core/nav.js";
import { relativeUrl, rootRelativeUrl } from "../core/paths.js";
import type { NavigationOptions } from "../core/theme.js";
import type { PageNavigation } from "./renderPage.js";

export type LayoutProps = {
  page: Page;
  nav: NavItem[];
  pageNavigation?: PageNavigation;
  css: string;
  searchIndexJson: string;
  logo: ResolvedLogo;
  favicon?: string;
  repositoryUrl?: string;
  projectName?: string;
  navigation?: NavigationOptions;
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
  favicon,
  repositoryUrl,
  projectName,
  navigation,
  dev,
}: LayoutProps) {
  const transition = navigation?.transition ?? "fade";
  const documentTitle = projectName ? `${page.title} • ${projectName}` : page.title;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{documentTitle}</title>
        {favicon ? <link rel="icon" href={assetSrc(page.route, favicon)} /> : null}
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
                <img className="brandLogo" src={assetSrc(page.route, logo.image)} alt="" />
              ) : null}
              {logo.text ? <span>{logo.text}</span> : null}
            </a>
            <div className="headerActions">
              {repositoryUrl ? (
                <a
                  className="repoButton"
                  href={repositoryUrl}
                  aria-label="View repository on GitHub"
                  title="View repository on GitHub"
                >
                  <svg
                    className="repoIcon"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 4.58c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                    />
                  </svg>
                </a>
              ) : null}
              <div id="lildocs-search-root" className="searchBox">
                <span className="searchIcon material-symbols-rounded" aria-hidden="true">
                  search
                </span>
                <input
                  id="lildocs-search-input"
                  type="search"
                  placeholder="Search docs"
                  aria-label="Search docs"
                />
              </div>
            </div>
          </header>
          <div id="swup" className="contentGrid">
            <aside className="sidebar">
              <nav aria-label="Documentation navigation">
                <NavList items={nav} currentRoute={page.route} pageRoute={page.route} />
              </nav>
            </aside>
            <main className={`content transition-${transition}`}>
              <article dangerouslySetInnerHTML={{ __html: page.html ?? "" }} />
              <PageNav pageNavigation={pageNavigation} />
            </main>
            <aside className={`toc transition-${transition}`}>
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
        <div id="lildocs-overlay-root" />
        <script type="module" src={rootRelativeUrl(page.route, "assets/search.js")} />
        <script src={rootRelativeUrl(page.route, "assets/copy-code.js")} />
        <script src={rootRelativeUrl(page.route, "assets/swup.umd.js")} />
        <script src={rootRelativeUrl(page.route, "assets/navigation.js")} />
        {dev ? <script type="module" src={dev.clientScriptPath} /> : null}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </body>
    </html>
  );
}

function assetSrc(pageRoute: string, image: string) {
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
        <li className={item.children.length > 0 ? "navGroup" : undefined}>
          {item.children.length > 0 && item.hasPage ? (
            <details className="navDisclosure" open={isActiveBranch(item, currentRoute)}>
              <summary className={item.route === currentRoute ? "active" : undefined}>
                {item.title}
              </summary>
              <NavList items={item.children} currentRoute={currentRoute} pageRoute={pageRoute} />
            </details>
          ) : item.children.length > 0 ? (
            <span className="navFolder">{item.title}</span>
          ) : (
            <a
              className={item.route === currentRoute ? "active" : undefined}
              href={relativeUrl(pageRoute, item.route)}
            >
              {item.title}
            </a>
          )}
          {item.children.length > 0 && !item.hasPage ? (
            <NavList items={item.children} currentRoute={currentRoute} pageRoute={pageRoute} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function isActiveBranch(item: NavItem, currentRoute: string): boolean {
  return (
    item.route === currentRoute ||
    item.children.some((child) => isActiveBranch(child, currentRoute))
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
