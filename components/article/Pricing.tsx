import { PRICING_FOOTNOTE, PRICING_GROUPS, PRICING_ROWS } from "@/data/pricing";
import { parsePricingGroups } from "@/lib/content/directives";

/** `::pricing`. Renders data/pricing.ts, the only place prices live. Not a
 *  table: each group is a real list, so it reads the same at every width. */
export default function Pricing({ groups, footnote }: { groups?: string; footnote?: string }) {
  const wanted = parsePricingGroups({ groups: groups ?? "" });
  const shown = PRICING_GROUPS.filter(
    (g) => (wanted.length === 0 || wanted.includes(g.id)) && PRICING_ROWS.some((r) => r.group === g.id),
  );
  if (shown.length === 0) return null;
  const showNote = footnote !== "off" && PRICING_FOOTNOTE.length > 0;
  return (
    <>
      <div className="rr-article-pricing" role="group" aria-label="Room Redo prices">
        {shown.map((g) => (
          <div key={g.id} className="rr-article-pricing-group">
            {g.label && (
              <p className="rr-article-pricing-head">
                <span>{g.label}</span>
                {g.note && <span className="rr-article-pricing-head-note">{g.note}</span>}
              </p>
            )}
            <ul>
              {PRICING_ROWS.filter((r) => r.group === g.id).map((r) => (
                <li key={r.id} className={`rr-article-pricing-row${g.id === "free" ? " rr-article-pricing-row--free" : ""}`}>
                  <div className="rr-article-pricing-main">
                    <span className="rr-article-pricing-name">{r.name}</span>
                    <span className="rr-article-pricing-detail">{r.detail}</span>
                  </div>
                  <div className="rr-article-pricing-cost">
                    <span className="rr-article-pricing-price">{r.price}</span>
                    {r.unit && <span className="rr-article-pricing-unit">{r.unit}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {showNote && <p className="rr-article-pricing-note">{PRICING_FOOTNOTE}</p>}
    </>
  );
}
