import BeforeAfterSlider from "@/components/BeforeAfterSlider";

const SIZES = "(min-width:700px) 480px, calc(100vw - 48px)";

export default function BeforeAfterFigure({
  before,
  after,
  beforeAlt,
  afterAlt,
  caption,
}: {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
  caption?: string;
}) {
  const lead = caption ? `${caption.trim().replace(/[.!?]+$/, "")}. ` : "";
  const provenance = caption
    ? `${lead}Redesigned in the Room Redo app.`
    : "Before and after, redesigned in the Room Redo app.";
  return (
    <figure className="rr-article-ba">
      <BeforeAfterSlider
        beforeSrc={before}
        afterSrc={after}
        beforeAlt={beforeAlt}
        afterAlt={afterAlt}
        heightVariant="storage"
        sizes={SIZES}
        label={caption ? `Before and after: ${caption}` : undefined}
      />
      <figcaption>{provenance}</figcaption>
    </figure>
  );
}
