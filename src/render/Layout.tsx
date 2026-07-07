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
  const repoIconUrl = rootRelativeUrl(page.route, "assets/github-icon.svg");
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{documentTitle}</title>
        {favicon ? <link rel="icon" href={assetSrc(page.route, favicon)} /> : null}
        <link rel="stylesheet" href={rootRelativeUrl(page.route, "assets/tabler-icons.css")} />
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
                  <span
                    className="repoIcon"
                    aria-hidden="true"
                    style={`--ld-repo-icon: url(${repoIconUrl})`}
                  />
                </a>
              ) : null}
              <div id="lildocs-search-root" className="searchBox">
                <span className="searchIcon ti ti-search" aria-hidden="true" />
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
              <article>
                <GroupBreadcrumbs route={page.route} />
                <div dangerouslySetInnerHTML={{ __html: page.html ?? "" }} />
              </article>
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

function GroupBreadcrumbs({ route }: { route: string }) {
  const dir = route.split("/").slice(0, -1);
  if (dir.length === 0) {
    return null;
  }

  return <p className="groupBreadcrumbs">{dir.map(titleFromDir).join(" / ")}</p>;
}

function titleFromDir(dir: string) {
  return dir
    .replace(/[-_]+/g, " ")
    .replace(/\S+/g, (word) => `${word[0]?.toLocaleUpperCase() ?? ""}${word.slice(1)}`);
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
