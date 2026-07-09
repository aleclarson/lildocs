export type AdjacentPageLink = {
  title: string;
  href: string;
};

export type PageNavigation = {
  previous?: AdjacentPageLink;
  next?: AdjacentPageLink;
};
