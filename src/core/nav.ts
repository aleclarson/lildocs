import path from "node:path";
import type { ContentModel, Page } from "./content.js";

export type NavItem = {
  title: string;
  route: string;
  hasPage: boolean;
  children: NavItem[];
};

export function buildNavigation(model: ContentModel): NavItem[] {
  const items = model.pages
    .filter((page) => page.sourcePath !== model.homePage)
    .map(pageToNavItem);

  return nestNavItems(items);
}

function pageToNavItem(page: Page): NavItem {
  return {
    title: page.title,
    route: page.route,
    hasPage: true,
    children: [],
  };
}

function nestNavItems(items: NavItem[]) {
  const topLevel: NavItem[] = [];
  const byDir = new Map<string, NavItem>();

  for (const item of items) {
    const dir = path.posix.dirname(item.route);
    if (dir === "/") {
      const group = byDir.get(item.route);
      if (group && item.route === group.route) {
        group.hasPage = true;
        continue;
      }
      topLevel.push(item);
      continue;
    }

    const parts = dir.split("/").filter(Boolean);
    let currentChildren = topLevel;
    let currentPath = "";

    for (const part of parts) {
      currentPath = `${currentPath}/${part}`;
      let group = byDir.get(currentPath);
      if (!group) {
        group = {
          title: titleFromDir(part),
          route: currentPath,
          hasPage: false,
          children: [],
        };
        byDir.set(currentPath, group);
        currentChildren.push(group);

        const indexPage = topLevel.findIndex(
          (candidate) => candidate.hasPage && candidate.route === currentPath,
        );
        if (indexPage !== -1) {
          group.hasPage = true;
          topLevel.splice(indexPage, 1);
        }
      }
      currentChildren = group.children;
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
