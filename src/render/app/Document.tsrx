import { Head, Scripts, type DocumentProps } from "flamefront/document";
import { useMatches } from "@octanejs/remix-router";
import type { LoaderData } from "./data.ts";
import { rootRelativeUrl } from "./urls.ts";

export default function Document({ children }: DocumentProps) @{
  const leaf = useMatches().at(-1);
  const data = leaf?.loaderData as LoaderData | undefined;
  const site = data?.site;
  const page = data?.page;
  const route = page?.route ?? "/";
  const relRoot = rootRelativeUrl(route, "");
  const title =
    page
      ? site?.projectName
        ? `${page.title} • ${site.projectName}`
        : page.title
      : site?.projectName ?? "lildocs";
  const favicon = site?.favicon;

  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>
        {title as string}
      </title>
      @if (favicon) {
        <link rel="icon" href={assetHref(relRoot, favicon)} />
      }
      <link rel="stylesheet" href={`${relRoot}assets/tabler-icons.css`} />
      <link rel="stylesheet" href={`${relRoot}assets/lildocs.css`} />
      <Head />
    </head>
    <body>
      {children}
      <div id="lildocs-overlay-root" />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__lildocs=${
            JSON.stringify({
              basename: site?.basename ?? "/",
              dev: site?.dev === true,
            })
          };`,
        }}
      />
      <Scripts />
    </body>
  </html>
}

function assetHref(relRoot: string, value: string) {
  if (
    /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:") ||
      value.startsWith("/")
  ) {
    return value;
  }

  return `${relRoot}${value}`;
}
