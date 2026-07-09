import type { Heading, Page } from "../core/content.js";
import type { ResolvedLogo } from "../core/logo.js";
import type { NavItem } from "../core/nav.js";
import type { NavigationOptions } from "../core/theme.js";
import { relativeUrl, rootRelativeUrl } from "./paths.js";
import type { PageNavigation } from "./types.js";

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
  clientScriptPath: string;
  clientStylePaths: string[];
};

export function Layout({
  page,
  nav,
  pageNavigation,
  searchIndexJson,
  logo,
  favicon,
  repositoryUrl,
  projectName,
  navigation,
  clientScriptPath,
  clientStylePaths,
}: LayoutProps) @{
  const transition = navigation?.transition ?? "fade";
  const repoIconUrl = rootRelativeUrl(page.route, "assets/github-icon.svg");
  const issueUrl = issueUrlForRepository(repositoryUrl);
  const repositoryLabel = repositoryLabelForUrl(repositoryUrl);

  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>
      {(projectName ? `${page.title} • ${projectName}` : page.title) as string}
    </title>
    @if (favicon) {
      <link rel="icon" href={assetSrc(page.route, favicon)} />
    }
    <link
      rel="stylesheet"
      href={rootRelativeUrl(page.route, "assets/tabler-icons.css")}
    />
    <link
      rel="stylesheet"
      href={rootRelativeUrl(page.route, "assets/lildocs.css")}
    />
    @for (const stylePath of clientStylePaths; key stylePath) {
      <link rel="stylesheet" href={assetSrc(page.route, stylePath)} />
    }
    <div class="pageShell">
      <aside id="lildocs-sidebar" class="sidebar">
        <div class="sidebarContents">
          <div class="sidebarHeader">
            <a class="brand" href={relativeUrl(page.route, "index.html")}>
              @if (logo.image) {
                <img
                  class="brandLogo"
                  src={assetSrc(page.route, logo.image)}
                  alt=""
                />
              }
              @if (logo.text) {
                <span>
                  {logo.text as string}
                </span>
              }
            </a>
            <button
              id="lildocs-sidebar-toggle"
              class="sidebarToggle"
              type="button"
              aria-label="Collapse sidebar"
              aria-controls="lildocs-sidebar"
            >
              <span
                class="ti ti-layout-sidebar-left-collapse"
                aria-hidden="true"
              />
            </button>
          </div>
          <div id="lildocs-search-root" class="searchBox">
            <span class="searchIcon ti ti-search" aria-hidden="true" />
            <input
              id="lildocs-search-input"
              type="search"
              placeholder="Search docs"
              aria-label="Search docs"
            />
          </div>
          <nav
            id="lildocs-sidebar-navigation"
            aria-label="Documentation navigation"
          >
            <NavList
              items={nav}
              currentRoute={page.route}
              pageRoute={page.route}
            />
          </nav>
        </div>
      </aside>
      <div class="sidebarFloatingControls">
        <button
          id="lildocs-sidebar-expand"
          class="sidebarToggle"
          type="button"
          aria-label="Expand sidebar"
          aria-controls="lildocs-sidebar"
        >
          <span class="ti ti-layout-sidebar-left-expand" aria-hidden="true" />
        </button>
        <button
          id="lildocs-floating-search"
          class="sidebarToggle"
          type="button"
          aria-label="Search docs"
        >
          <span class="ti ti-search" aria-hidden="true" />
        </button>
      </div>
      <div id="swup" class="contentGrid">
        <main class={`content transition-${transition}`}>
          <article>
            <GroupBreadcrumbs route={page.route} />
            <div dangerouslySetInnerHTML={{ __html: page.html ?? "" }} />
          </article>
          <PageNav pageNavigation={pageNavigation} />
        </main>
        <aside class={`toc transition-${transition}`}>
          <Toc
            headings={page.headings}
            repositoryUrl={repositoryUrl}
            repositoryLabel={repositoryLabel}
            repoIconUrl={repoIconUrl}
          />
        </aside>
      </div>
    </div>
    <script
      dangerouslySetInnerHTML={{
        __html: `window.lildocsSearchUrl = ${JSON.stringify(
          rootRelativeUrl(page.route, "search-index.json"),
        )};${
          issueUrl
            ? `window.lildocsIssueUrl = ${JSON.stringify(issueUrl)};`
            : ""
        }`,
      }}
    />
    <script
      type="application/json"
      id="lildocs-search-index"
      dangerouslySetInnerHTML={{ __html: searchIndexJson }}
    />
    <div id="lildocs-overlay-root" />
    <script type="module" src={assetSrc(page.route, clientScriptPath)} />
  </>
}

function issueUrlForRepository(repositoryUrl: string | undefined) {
  if (!repositoryUrl) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(repositoryUrl);
  } catch {
    return undefined;
  }

  if (url.hostname !== "github.com") {
    return undefined;
  }

  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) {
    return undefined;
  }

  return `https://github.com/${owner}/${repo}/issues/new`;
}

function repositoryLabelForUrl(repositoryUrl: string | undefined) {
  if (!repositoryUrl) {
    return undefined;
  }

  try {
    const url = new URL(repositoryUrl);
    if (url.hostname !== "github.com") {
      return undefined;
    }

    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    return owner && repo ? `${owner}/${repo}` : undefined;
  } catch {
    return undefined;
  }
}

function assetSrc(pageRoute: string, image: string) {
  if (
    /^(?:[a-z]+:)?\/\//i.test(image) || image.startsWith("data:") ||
      image.startsWith("/")
  ) {
    return image;
  }

  return rootRelativeUrl(pageRoute, image);
}

function GroupBreadcrumbs({ route }: { route: string }) @{
  const dir = route.split("/").slice(0, -1);
  if (dir.length === 0) {
    return null;
  }

  <p class="groupBreadcrumbs">
    {dir.map(titleFromDir).join(" / ") as string}
  </p>
}

function titleFromDir(dir: string) {
  return dir.replace(/[-_]+/g, " ").replace(
    /\S+/g,
    (word) => `${word[0]?.toLocaleUpperCase() ?? ""}${word.slice(1)}`,
  );
}

function PageNav({ pageNavigation }: { pageNavigation?: PageNavigation }) @{
  if (!pageNavigation?.next) {
    return null;
  }

  <nav class="pageNav" aria-label="Page navigation">
    <p>
      {"Next: "}
      <a rel="next" href={pageNavigation.next.href}>
        {pageNavigation.next.title as string}
      </a>
    </p>
  </nav>
}

function NavList({
  items,
  currentRoute,
  pageRoute,
}: {
  items: NavItem[];
  currentRoute: string;
  pageRoute: string;
}) @{
  <ul class="navList">
    @for (const item of items; key item.route) {
      <li class={item.children.length > 0 ? "navGroup" : undefined}>
        @if (item.children.length > 0 && item.hasPage) {
          <details
            class="navDisclosure"
            open={isActiveBranch(item, currentRoute)}
          >
            <summary class={item.route === currentRoute ? "active" : undefined}>
              {item.title as string}
            </summary>
            <NavList
              items={item.children}
              currentRoute={currentRoute}
              pageRoute={pageRoute}
            />
          </details>
        } @else if (item.children.length > 0) {
          <span class="navFolder">
            {item.title as string}
          </span>
        } @else {
          <a
            class={item.route === currentRoute ? "active" : undefined}
            href={relativeUrl(pageRoute, item.route)}
          >
            {item.title as string}
          </a>
        }
        @if (item.children.length > 0 && !item.hasPage) {
          <NavList
            items={item.children}
            currentRoute={currentRoute}
            pageRoute={pageRoute}
          />
        }
      </li>
    }
  </ul>
}

function isActiveBranch(item: NavItem, currentRoute: string): boolean {
  return item.route === currentRoute ||
    item.children.some((child) => isActiveBranch(child, currentRoute));
}

function Toc({
  headings,
  repositoryUrl,
  repositoryLabel,
  repoIconUrl,
}: {
  headings: Heading[];
  repositoryUrl?: string;
  repositoryLabel?: string;
  repoIconUrl: string;
}) @{
  const tocHeadings = headings.filter(
    (heading) => heading.depth > 1 && heading.depth < 4,
  );
  if (tocHeadings.length === 0 && !repositoryLabel) {
    return null;
  }

  <nav aria-label="Table of contents">
    @if (tocHeadings.length > 0) {
      <>
        <p>On this page</p>
        <ul>
          @for (const heading of tocHeadings; key heading.id) {
            <li class={`tocDepth${heading.depth}`}>
              <a href={`#${heading.id}`}>
                {heading.text as string}
              </a>
            </li>
          }
        </ul>
      </>
    }
    @if (repositoryUrl && repositoryLabel) {
      <a
        class="tocRepoLink"
        href={repositoryUrl}
        aria-label="View repository on GitHub"
      >
        <span
          class="repoIcon"
          aria-hidden="true"
          style={`--ld-repo-icon: url(${repoIconUrl})`}
        />
        <span>
          {repositoryLabel as string}
        </span>
      </a>
    }
  </nav>
}
