import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { visit } from "unist-util-visit";
import { toString as hastToString } from "hast-util-to-string";
import type { Element, Root as HastRoot } from "hast";
import type { Root } from "mdast";
import ArticleImage from "@/components/article/ArticleImage";
import BeforeAfterFigure from "@/components/article/BeforeAfterFigure";
import CtaBlock from "@/components/article/CtaBlock";
import StyleCards from "@/components/article/StyleCards";
import type { ArticleContext } from "@/components/DownloadCta";
import { parseStyleIds } from "@/lib/content/directives";
import { assertDirectivesValid } from "@/lib/content/read";
import { SITE_URL } from "@/lib/site";

/** Turns each whitelisted directive into a custom hast element the component
 *  map below renders. An invalid or unknown one throws, which fails the build. */
function remarkArticleDirectives(where: string) {
  return (tree: Root) => {
    assertDirectivesValid(tree, where);
    visit(tree, (node) => {
      if (node.type !== "leafDirective") return;
      const attrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(node.attributes ?? {})) attrs[k] = v ?? "";
      node.data = {
        hName: `rr-${node.name}`,
        hProperties: node.name === "style-card" ? { ids: parseStyleIds(attrs).join(" "), text: attrs.text } : attrs,
      };
    });
  };
}

function isImageOnlyParagraph(node: Element | undefined): boolean {
  if (!node) return false;
  const kids = node.children.filter((c) => !(c.type === "text" && !c.value.trim()));
  return kids.length === 1 && kids[0].type === "element" && kids[0].tagName === "img";
}

function Anchor({ href = "", children, ...rest }: ComponentProps<"a">) {
  const internal =
    href.startsWith("/") || href.startsWith("#") || href.startsWith(SITE_URL);
  if (internal) {
    const local = href.startsWith(SITE_URL) ? href.slice(SITE_URL.length) || "/" : href;
    return <Link href={local}>{children}</Link>;
  }
  return (
    <a href={href} rel="noopener" {...rest}>
      {children}
    </a>
  );
}

/**
 * Renders an article body. Markdown plus the whitelisted directives only: raw
 * HTML in the source is dropped, never rendered.
 */
export function renderArticleBody(body: string, where: string, ctx: ArticleContext & { campaign: string }): ReactNode {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkArticleDirectives, where)
    .use(remarkRehype)
    .use(rehypeSlug);
  const hast = processor.runSync(processor.parse(body)) as HastRoot;

  const article = { slug: ctx.slug, type: ctx.type };

  return toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    passNode: true,
    components: {
      a: Anchor,
      p: ({ node, children, ...rest }: ComponentProps<"p"> & { node?: Element }) =>
        isImageOnlyParagraph(node) ? <>{children}</> : <p {...rest}>{children}</p>,
      img: ({ src, alt, title }: ComponentProps<"img">) => (
        <ArticleImage src={String(src)} alt={alt ?? ""} title={title} />
      ),
      table: ({ node, children }: ComponentProps<"table"> & { node?: Element }) => {
        const caption = node?.children.find(
          (c): c is Element => c.type === "element" && c.tagName === "caption",
        );
        return (
          <div
            className="rr-article-table"
            role="region"
            tabIndex={0}
            aria-label={caption ? hastToString(caption) : "Table"}
          >
            <table>{children}</table>
          </div>
        );
      },
      th: ({ children, align }: ComponentProps<"th">) => (
        <th scope="col" align={align}>
          {children}
        </th>
      ),
      "rr-before-after": (p: Record<string, string>) => (
        <BeforeAfterFigure
          before={p.before}
          after={p.after}
          beforeAlt={p.beforeAlt}
          afterAlt={p.afterAlt}
          caption={p.caption}
        />
      ),
      "rr-cta": (p: Record<string, string>) => (
        <CtaBlock
          variant={p.variant === "end" ? "end" : "mid"}
          title={p.title}
          text={p.text}
          campaign={ctx.campaign}
          article={article}
        />
      ),
      "rr-style-card": (p: Record<string, string>) => (
        <StyleCards ids={p.ids.split(" ").filter(Boolean)} text={p.text} />
      ),
    } as never,
  });
}
