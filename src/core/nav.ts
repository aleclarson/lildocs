import path from "node:path";
import type { ContentModel, Page } from "./content.js";

export type NavItem = {
  title: string;
  route: string;
  active: boolean;
  hasPage: boolean;
  children: NavItem[];
};

export function buildNavigation(
  model: ContentModel,
  activePage: Page,
): NavItem[] {
  const items = model.pages
    .filter((page) => page.sourcePath !== model.homePage)
    .map((page) => pageToNavItem(page, activePage));

  return nestNavItems(items);
}

function pageToNavItem(page: Page, activePage: Page): NavItem {
  return {
    title: page.title,
    route: page.route,
    active: page.route === activePage.route,
    hasPage: true,
    children: [],
  };
}

function nestNavItems(items: NavItem[]) {
  const topLevel: NavItem[] = [];
  const byDir = new Map<string, NavItem>();

  for (const item of items) {
    const dir = path.posix.dirname(item.route);
    if (dir === ".") {
      topLevel.push(item);
      continue;
    }

    const parts = dir.split("/");
    let currentChildren = topLevel;
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let group = byDir.get(currentPath);
      if (!group) {
        group = {
          title: titleFromDir(part),
          route: `${currentPath}/index.html`,
          active: false,
          hasPage: false,
          children: [],
        };
        byDir.set(currentPath, group);
        currentChildren.push(group);
      }
      currentChildren = group.children;
    }

    const group = byDir.get(dir);
    if (group && item.route === group.route) {
      group.active = item.active;
      group.hasPage = true;
      continue;
    }

    currentChildren.push(item);
  }

  return topLevel;
}

function titleFromDir(dir: string) {
  return dir
    .replace(/[-_]+/g, " ")
    .replace(
      /\S+/g,
      (word) => `${word[0]?.toLocaleUpperCase() ?? ""}${word.slice(1)}`,
    );
}
