import Image from "next/image";

/** The author's photo, or a monogram until one exists. Decorative: the name
 *  always sits next to it. */
export default function Avatar({
  name,
  photo,
  size,
  className,
}: {
  name: string;
  photo: string | null;
  size: number;
  className?: string;
}) {
  return (
    <span className={`rr-article-avatar ${className ?? ""}`} aria-hidden="true">
      {photo ? (
        <Image src={photo} alt="" width={size * 2} height={size * 2} />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
