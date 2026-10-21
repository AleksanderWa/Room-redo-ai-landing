import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleHub, { hubMetadata } from "@/components/article/ArticleHub";
import { hasPublished } from "@/lib/content/load";

export function generateMetadata(): Metadata {
  return hasPublished("ideas") ? hubMetadata("ideas") : {};
}

export default function IdeasHub() {
  // No empty hub: /ideas 404s until the first non-draft ideas article exists.
  if (!hasPublished("ideas")) notFound();
  return <ArticleHub type="ideas" />;
}
