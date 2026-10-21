import type { Metadata } from "next";
import ArticleHub, { hubMetadata } from "@/components/article/ArticleHub";

export function generateMetadata(): Metadata {
  return hubMetadata("guides");
}

export default function GuidesHub() {
  return <ArticleHub type="guides" />;
}
