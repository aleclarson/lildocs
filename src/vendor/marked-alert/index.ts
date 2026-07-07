import type { MarkedExtension, Token, Tokens } from "marked";

export type AlertVariant = {
  type: string;
  icon: string;
  title?: string;
  titleClassName?: string;
};

export type AlertOptions = {
  className?: string;
  variants?: AlertVariant[];
};

type AlertToken = Token & {
  type: "alert";
  meta: {
    className: string;
    variant: string;
    icon: string;
    title: string;
    titleClassName: string;
  };
  tokens: Token[];
};

const defaultAlertVariants: AlertVariant[] = [
  {
    type: "note",
    icon: tablerIcon("info-circle"),
  },
  {
    type: "tip",
    icon: tablerIcon("bulb"),
  },
  {
    type: "important",
    icon: tablerIcon("message-report"),
  },
  {
    type: "warning",
    icon: tablerIcon("alert-triangle"),
  },
  {
    type: "caution",
    icon: tablerIcon("alert-circle"),
  },
];

export function markedAlert(options: AlertOptions = {}): MarkedExtension {
  const { className = "markdown-alert", variants = [] } = options;
  const resolvedVariants = resolveVariants(variants);

  return {
    walkTokens(token) {
      if (token.type !== "blockquote") {
        return;
      }

      const matchedVariant = resolvedVariants.find(({ type }) =>
        new RegExp(createSyntaxPattern(type)).test(token.text),
      );
      if (!matchedVariant) {
        return;
      }

      const {
        type: variant,
        icon,
        title = capitalize(matchedVariant.type),
        titleClassName = `${className}-title`,
      } = matchedVariant;
      const syntaxPattern = new RegExp(createSyntaxPattern(variant));

      Object.assign(token, {
        type: "alert",
        meta: {
          className,
          variant,
          icon,
          title,
          titleClassName,
        },
      } satisfies Partial<AlertToken>);

      const firstLine = token.tokens?.[0] as Tokens.Paragraph | undefined;
      const firstLineText = firstLine?.raw?.replace(syntaxPattern, "").trim();
      if (!firstLine || !firstLineText) {
        token.tokens?.shift();
        return;
      }

      const markerToken = firstLine.tokens[0] as Tokens.Text | undefined;
      if (markerToken) {
        Object.assign(markerToken, {
          raw: markerToken.raw.replace(syntaxPattern, ""),
          text: markerToken.text.replace(syntaxPattern, ""),
        });
      }

      if (firstLine.tokens[1]?.type === "br") {
        firstLine.tokens.splice(1, 1);
      }
    },
    extensions: [
      {
        name: "alert",
        level: "block",
        renderer(token) {
          const { meta, tokens = [] } = token as AlertToken;
          let html = `<div class="${meta.className} ${meta.className}-${meta.variant}">\n`;
          html += `<p class="${meta.titleClassName}">`;
          html += meta.icon;
          html += meta.title;
          html += "</p>\n";
          html += this.parser.parse(tokens);
          html += "</div>\n";

          return html;
        },
      },
    ],
  };
}

function resolveVariants(variants: AlertVariant[]) {
  if (!variants.length) {
    return defaultAlertVariants;
  }

  return Object.values(
    [...defaultAlertVariants, ...variants].reduce<Record<string, AlertVariant>>((map, item) => {
      map[item.type] = item;
      return map;
    }, {}),
  );
}

function createSyntaxPattern(type: string) {
  return `^(?:\\[!${escapeRegExp(type.toUpperCase())}]\\s*?)\\n*`;
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase();
}

function tablerIcon(name: string) {
  return `<span class="ti ti-${name} markdown-alert-icon" aria-hidden="true"></span>`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
