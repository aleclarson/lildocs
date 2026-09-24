import type { LoaderArgs } from "flamefront/server";
import { useLoaderData } from "@octanejs/remix-router";
import { useEffect } from "octane";
import type { AdjacentPage, DocsData, Heading, LoaderData } from "./data.ts";
import { enhancePageContent } from "./enhance.ts";
import { relativeUrl } from "./urls.ts";

export function loader({ params, context }: LoaderArgs<DocsData>) {
  const splat = (params as Record<string, string | undefined>)["*"] ?? "";
  const route = `/${splat}`.replace(/\/+$/, "") || "/";
  const page = context.pages[route];
  if (!page) {
    throw new Response("Not found", { status: 404 });
  }

  return { site: context.site, page } satisfies LoaderData;
}

export default function DocsPage() @{
  const { page, site } = useLoaderData<LoaderData>();
  const transition = site.transition || "fade";

  useEffect(() => {
    enhancePageContent();
  }, []);

  <>
    <main class={`content transition-${transition}`}>
      <article>
        <GroupBreadcrumbs route={page.route} />
        <div dangerouslySetInnerHTML={{ __html: page.html }} />
      </article>
      <PageNav next={page.next} pageRoute={page.route} />
    </main>
    <aside class={`toc transition-${transition}`}>
      <Toc
        headings={page.headings}
        repositoryUrl={site.repositoryUrl}
        repositoryLabel={site.repositoryLabel}
      />
    </aside>
  </>
}

function GroupBreadcrumbs({ route }: { route: string }) @{
  const dir = route.split("/").filter(Boolean).slice(0, -1);
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

function PageNav({
  next,
  pageRoute,
}: {
  next?: AdjacentPage;
  pageRoute: string;
}) @{
  if (!next) {
    return null;
  }

  <nav class="pageNav" aria-label="Page navigation">
    <p>
      {"Next: "}
      <a rel="next" href={relativeUrl(pageRoute, next.route)}>
        {next.title as string}
      </a>
    </p>
  </nav>
}

function Toc({
  headings,
  repositoryUrl,
  repositoryLabel,
}: {
  headings: Heading[];
  repositoryUrl?: string;
  repositoryLabel?: string;
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
        <p class="tocTitle">
          <span class="ti ti-align-left" aria-hidden="true" />
          On this page
        </p>
        <div class="tocLinks" data-toc-links>
          <span class="tocRail" aria-hidden="true" />
          <span class="tocVisibility" data-toc-visibility aria-hidden="true" />
          <ul>
            @for (const heading of tocHeadings; key heading.id) {
              <li class={`tocDepth${heading.depth}`}>
                <a href={`#${heading.id}`}>
                  {heading.text as string}
                </a>
              </li>
            }
          </ul>
        </div>
      </>
    }
    @if (repositoryUrl && repositoryLabel) {
      <a
        class="tocRepoLink"
        href={repositoryUrl}
        aria-label="View repository on GitHub"
      >
        <span class="repoIcon" aria-hidden="true" />
        <span>
          {repositoryLabel as string}
        </span>
      </a>
    }
  </nav>
}
