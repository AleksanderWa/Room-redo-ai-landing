/** The "AI redesign" label every generated image carries. */
export default function AiPill({ className = "" }: { className?: string }) {
  return (
    <span className={`rr-article-pill ${className}`} aria-hidden="true">
      AI redesign
    </span>
  );
}
