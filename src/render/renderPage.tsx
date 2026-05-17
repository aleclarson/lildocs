import { h } from "preact";
import { render } from "preact-render-to-string";
import type { Page } from "../core/content.js";
import type { NavItem } from "../core/nav.js";
import { Layout } from "./Layout.js";

export function renderPage(page: Page, nav: NavItem[], css: string, searchIndexJson: string) {
  return `<!doctype html>${render(
    <Layout page={page} nav={nav} css={css} searchIndexJson={searchIndexJson} />,
  )}`;
}
