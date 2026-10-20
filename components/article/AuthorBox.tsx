import Link from "next/link";
import Avatar from "@/components/article/Avatar";
import { authorPhoto, type Author } from "@/lib/content/authors";

export default function AuthorBox({ author }: { author: Author }) {
  return (
    <aside aria-label="About the author" className="rr-article-author">
      <Avatar name={author.name} photo={authorPhoto(author.id)} size={56} className="rr-article-avatar--box" />
      <div className="rr-article-author-text">
        <p className="rr-eyebrow rr-article-author-eyebrow">Written by</p>
        <p className="rr-article-author-name">
          <Link href={author.path}>{author.name}</Link>
        </p>
        <p className="rr-article-author-role">{author.role}</p>
        <p className="rr-article-author-bio">{author.summary}</p>
        <Link href={author.path} className="rr-article-author-more">
          More about {author.name}
        </Link>
      </div>
    </aside>
  );
}
