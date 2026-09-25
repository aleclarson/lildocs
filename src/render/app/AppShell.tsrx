import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatches,
  useNavigate,
  useNavigation,
} from "@octanejs/remix-router";
import { useEffect } from "octane";
import type { LoaderData, NavItem, SiteData } from "./data.ts";
import { initSidebar } from "./sidebar.ts";
import { relativeUrl, rootRelativeUrl, stripBasename } from "./urls.ts";
import { SearchBox } from "./Search.tsrx";

export default function AppShell() @{
  const location = useLocation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const leaf = useMatches().at(-1);
  const data = leaf?.loaderData as LoaderData | undefined;
  const site = data?.site;
  const basename = site?.basename ?? "/";
  const appPathname = normalizePath(stripBasename(location.pathname, basename));
  const pageRoute = data?.page.route ?? appPathname;

  useEffect(() => {
    initSidebar();
  }, []);

  useEffect(() => registerPageNavigation(site, navigate), [site, navigate]);
  useNavigationTransition(navigation);

  <>
    <div class="pageShell">
      <aside id="lildocs-sidebar" class="sidebar">
        <div class="sidebarContents">
          <div class="sidebarHeader">
            <a class="brand" href={relativeUrl(pageRoute, "/")}>
              @if (site?.logo?.image) {
                <img
                  class="brandLogo"
                  src={assetHref(pageRoute, site.logo.image)}
                  alt=""
                />
              }
              @if (site?.logo?.text) {
                <span>
                  {site.logo.text as string}
                </span>
              }
            </a>
            <button
              id="lildocs-sidebar-toggle"
              class="sidebarToggle"
              type="button"
              aria-label="Collapse sidebar"
              aria-controls="lildocs-sidebar"
              aria-expanded="false"
            >
              <span
                class="sidebarCollapseIcon ti ti-layout-sidebar-left-collapse"
                aria-hidden="true"
              />
              <span class="sidebarMenuIcon ti ti-menu-2" aria-hidden="true" />
            </button>
          </div>
          <div id="lildocs-search-root" class="searchBox">
            <SearchBox issueUrl={site?.issueUrl} />
          </div>
          <nav
            id="lildocs-sidebar-navigation"
            aria-label="Documentation navigation"
          >
            @if (site) {
              <NavList
                items={site.nav}
                appPathname={appPathname}
                pageRoute={pageRoute}
              />
            }
          </nav>
          @if (site?.repositoryUrl && site.repositoryLabel) {
            <a
              class="sidebarRepoLink"
              href={site.repositoryUrl}
              aria-label="View repository on GitHub"
            >
              <span class="repoIcon" aria-hidden="true" />
              <span>
                {site.repositoryLabel as string}
              </span>
            </a>
          }
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
      <div id="lildocs-outlet" class="contentGrid">
        <Outlet />
      </div>
    </div>
    <ScrollRestoration />
  </>
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

/** Map a static `index.html` file path back to its app route. */
function normalizePagePath(pathname: string) {
  const normalized = normalizePath(pathname);
  if (normalized === "/index.html") {
    return "/";
  }
  return normalized.endsWith("/index.html")
    ? normalized.slice(0, -"/index.html".length)
    : normalized;
}

/** Fade/slide the page content while a fragment navigation is in flight. */
function useNavigationTransition(navigation: ReturnType<typeof useNavigation>) {
  useEffect(() => {
    const root = document.documentElement;
    if (navigation.state === "loading") {
      root.classList.add("is-changing", "is-animating");
      return;
    }

    root.classList.remove("is-animating");
    const timeout = window.setTimeout(() => {
      root.classList.remove("is-changing");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [navigation.state]);
}

/**
 * Route internal page links through the browser router when the target is a
 * known docs page; other links (assets, downloads, external URLs) keep their
 * default navigation.
 */
function registerPageNavigation(
  site: SiteData | undefined,
  navigate: ReturnType<typeof useNavigate>,
) {
  if (!site) {
    return;
  }

  const routes = new Set(site.nav.flatMap(function flatten(item): string[] {
    return [
      ...(item.hasPage ? [item.route] : []),
      ...item.children.flatMap(flatten),
    ];
  }));
  routes.add("/");

  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
    ) {
      return;
    }

    const anchor = (event.target as Element | null)?.closest?.("a[href]");
    if (
      !anchor || anchor.target || anchor.hasAttribute("download") ||
        anchor.getAttribute("rel") === "external"
    ) {
      return;
    }

    const url = new URL(anchor.getAttribute("href") ?? "", document.baseURI);
    if (url.origin !== window.location.origin) {
      return;
    }

    const route = normalizePagePath(stripBasename(url.pathname, site.basename));
    if (!routes.has(route)) {
      return;
    }

    event.preventDefault();
    navigate({
      pathname: route,
      search: url.search,
      hash: url.hash,
    });
  };

  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

function assetHref(pageRoute: string, value: string) {
  if (
    /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:") ||
      value.startsWith("/")
  ) {
    return value;
  }

  return rootRelativeUrl(pageRoute, value);
}

function NavList({
  items,
  appPathname,
  pageRoute,
}: {
  items: NavItem[];
  appPathname: string;
  pageRoute: string;
}) @{
  <ul class="navList">
    @for (const item of items; key item.route) {
      const isReferenceGroup = item.route === "/reference";
      <li class={item.children.length > 0 ? "navGroup" : undefined}>
        @if (isReferenceGroup) {
          <>
            <span class="navFolder">
              {item.title as string}
            </span>
            <NavList
              items={flattenNavPages(item.children)}
              appPathname={appPathname}
              pageRoute={pageRoute}
            />
          </>
        } @else if (item.children.length > 0 && item.hasPage) {
          <details
            class="navDisclosure"
            open={isActiveBranch(item, appPathname)}
          >
            <summary class={item.route === appPathname ? "active" : undefined}>
              {item.title as string}
            </summary>
            <NavList
              items={item.children}
              appPathname={appPathname}
              pageRoute={pageRoute}
            />
          </details>
        } @else if (item.children.length > 0) {
          <span class="navFolder">
            {item.title as string}
          </span>
        } @else {
          <a
            class={item.route === appPathname ? "active" : undefined}
            href={relativeUrl(pageRoute, item.route)}
          >
            {item.title as string}
          </a>
        }
        @if (item.children.length > 0 && !item.hasPage && !isReferenceGroup) {
          <NavList
            items={item.children}
            appPathname={appPathname}
            pageRoute={pageRoute}
          />
        }
      </li>
    }
  </ul>
}

function flattenNavPages(items: NavItem[]): NavItem[] {
  return items.flatMap(
    (item) => [
      ...(item.hasPage
        ? [
            { ...item, children: [] },
          ]
        : []),
      ...flattenNavPages(item.children),
    ],
  );
}

function isActiveBranch(item: NavItem, appPathname: string): boolean {
  return item.route === appPathname ||
    item.children.some((child) => isActiveBranch(child, appPathname));
}
