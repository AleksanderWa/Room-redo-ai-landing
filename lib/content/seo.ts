import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import type { Author } from "@/lib/content/authors";
import { articlePath, type Article } from "@/lib/content/load";
import { SECTIONS } from "@/lib/content/sections";

export const RSS_ALTERNATE = { "application/rss+xml": `${SITE_URL}/feed.xml` };

export const abs = (p: string) => `${SITE_URL}${p}`;

const isoDateTime = (d: string) => `${d}T00:00:00.000Z`;

const publisher = {
  "@type": "Organization",
  name: "Room Redo",
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: abs("/images/brand-icon.png") },
};

export function authorRef(author: Author) {
  return { "@type": "Person", "@id": `${abs(author.path)}#person`, name: author.name, url: abs(author.path) };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

// No FAQPage and no HowTo: Google no longer shows those rich results.
export function articleJsonLd(a: Article, author: Author) {
  const url = abs(articlePath(a));
  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: a.title,
      description: a.description,
      image: [abs(a.hero.src)],
      datePublished: a.datePublished,
      dateModified: a.dateModified,
      inLanguage: "en-US",
      wordCount: a.wordCount,
      keywords: [a.primaryKeyword, ...a.secondaryKeywords].join(", "),
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: authorRef(author),
      publisher,
    },
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: SECTIONS[a.type].label, path: SECTIONS[a.type].path },
      { name: a.title, path: articlePath(a) },
    ]),
  ];
}

export function authorJsonLd(author: Author) {
  const url = abs(author.path);
  const person = {
    "@type": "Person",
    "@id": `${url}#person`,
    name: author.name,
    jobTitle: author.role,
    description: author.summary,
    url,
    ...(author.links.length ? { sameAs: author.links.map((l) => l.url) } : {}),
    worksFor: { "@type": "Organization", name: "Room Redo", url: SITE_URL },
  };
  return [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url,
      mainEntity: person,
    },
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: author.name, path: author.path },
    ]),
  ];
}

export function articleMetadata(a: Article, author: Author): Metadata {
  const path = articlePath(a);
  return {
    title: a.seoTitle,
    description: a.description,
    alternates: { canonical: path, types: RSS_ALTERNATE },
    authors: [{ name: author.name, url: abs(author.path) }],
    // The OG image comes from the sibling opengraph-image.tsx.
    openGraph: {
      type: "article",
      url: abs(path),
      siteName: "Room Redo AI",
      title: a.title,
      description: a.description,
      publishedTime: isoDateTime(a.datePublished),
      modifiedTime: isoDateTime(a.dateModified),
      authors: [abs(author.path)],
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.description },
  };
}
