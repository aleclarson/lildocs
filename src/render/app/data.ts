export type Heading = {
  depth: number;
  text: string;
  id: string;
};

export type AdjacentPage = {
  title: string;
  /** App-relative route path, such as `/guide/intro`. */
  route: string;
};

export type PageData = {
  /** App-relative route path, such as `/guide/intro` or `/`. */
  route: string;
  title: string;
  /** Pre-rendered article markup. */
  html: string;
  headings: Heading[];
  previous?: AdjacentPage;
  next?: AdjacentPage;
};

export type NavItem = {
  title: string;
  /** App-relative route path; group items use the path of their index page. */
  route: string;
  hasPage: boolean;
  children: NavItem[];
};

export type SiteLogo = {
  /** Root-relative asset path or absolute URL. */
  image?: string;
  text?: string;
};

export type SiteData = {
  /** URL prefix the site is served under, such as `/` or `/docs/`. */
  basename: string;
  projectName?: string;
  logo?: SiteLogo;
  /** Root-relative asset path or absolute URL. */
  favicon?: string;
  repositoryUrl?: string;
  repositoryLabel?: string;
  issueUrl?: string;
  nav: NavItem[];
  transition: string;
  dev?: boolean;
};

/** Loader context injected at render time. */
export type DocsData = {
  site: SiteData;
  pages: Record<string, PageData>;
};

/** Data returned by the page loader and embedded in each document. */
export type LoaderData = {
  site: SiteData;
  page: PageData;
};
