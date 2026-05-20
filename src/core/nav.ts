import path from "node:path";
import type { ContentModel, Page } from "./content.js";

export type NavItem = {
  title: string;
  route: string;
  active: boolean;
  children: NavItem[];
};

export function buildNavigation(model: ContentModel, activePage: Page): NavItem[] {
  const items = model.pages.map((page) => pageToNavItem(page, activePage));

  return nestNavItems(items);
}

function pageToNavItem(page: Page, activePage: Page): NavItem {
  return {
    title: page.title,
    route: page.route,
    active: page.route === activePage.route,
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
          children: [],
        };
        byDir.set(currentPath, group);
        currentChildren.push(group);
      }
      currentChildren = group.children;
    }

    currentChildren.push(item);
  }

  return topLevel;
}

function titleFromDir(dir: string) {
  return dir.replace(/[-_]+/g, " ");
}
