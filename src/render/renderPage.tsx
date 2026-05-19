import { h } from "preact";
import { render } from "preact-render-to-string";
import type { Page } from "../core/content.js";
import type { ResolvedLogo } from "../core/logo.js";
import type { NavItem } from "../core/nav.js";
import { Layout } from "./Layout.js";

export type AdjacentPageLink = {
  title: string;
  href: string;
};

export type PageNavigation = {
  previous?: AdjacentPageLink;
  next?: AdjacentPageLink;
};

export function renderPage(
  page: Page,
  nav: NavItem[],
  pageNavigation: PageNavigation | undefined,
  css: string,
  searchIndexJson: string,
  logo: ResolvedLogo,
  favicon: string | undefined,
  repositoryUrl: string | undefined,
  dev?: {
    clientScriptPath: string;
  },
) {
  return `<!doctype html>${render(
    <Layout
      page={page}
      nav={nav}
      pageNavigation={pageNavigation}
      css={css}
      searchIndexJson={searchIndexJson}
      logo={logo}
      favicon={favicon}
      repositoryUrl={repositoryUrl}
      dev={dev}
    />,
  )}`;
}
