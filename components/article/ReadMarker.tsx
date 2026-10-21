/** Zero-height boundary of the range `ReadDepth` measures. Always rendered as
 *  `start` right before the article prose and as `end` right after it (before
 *  the FAQ and the end CTA), on every article. */
export default function ReadMarker({ edge }: { edge: "start" | "end" }) {
  return <div aria-hidden="true" style={{ height: 0 }} {...{ [`data-rr-read-${edge}`]: "" }} />;
}
