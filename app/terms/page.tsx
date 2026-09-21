import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Use — Room Redo AI",
  description: "The terms that govern your use of the Room Redo AI app.",
  alternates: { canonical: "/terms" },
};

const EFFECTIVE_DATE = "14 September 2026";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" effectiveDate={EFFECTIVE_DATE}>
      <p>
        These terms govern your use of the Room Redo AI iOS app (&quot;Room Redo,&quot; &quot;the app&quot;),
        operated by Aleksander Walkowski, based in Poland (&quot;we,&quot; &quot;us&quot;). By using Room Redo,
        you agree to them. If you don&apos;t agree, don&apos;t use the app.
      </p>

      <h2>What Room Redo does</h2>
      <p>
        You photograph a room or corner of your home, and Room Redo generates AI-produced redesign images
        in styles you choose. Results are AI-generated visualizations, not architectural, structural, or
        professional design advice — always use your own judgment (and a qualified professional, where
        appropriate) before making real changes based on them.
      </p>

      <h2>Eligibility</h2>
      <p>You must be at least 16 years old to use Room Redo. By using the app, you confirm you meet that requirement.</p>

      <h2>Your photos and content</h2>
      <p>
        You keep ownership of the photos you upload. You&apos;re responsible for having the right to use and
        upload them, and for making sure they don&apos;t contain other identifiable people who haven&apos;t
        consented, or anything illegal, infringing, or harmful. We may decline to process a photo — before
        or after upload — that we reasonably believe violates this.
      </p>
      <p>
        You grant us a license to store and process your photos solely to provide the app&apos;s features to
        you (generating and displaying your redesigns). We don&apos;t use your photos to train AI models, and
        we don&apos;t sell or publish them.
      </p>

      <h2>Redesigns, balance, and subscriptions</h2>
      <ul>
        <li>Every new device gets one free redesign. Additional redesigns require a paid plan or a one-time top-up, both purchased through the Apple App Store.</li>
        <li>Subscriptions auto-renew at the price and interval shown at purchase until you cancel. Manage or cancel anytime via <strong>Settings → Manage subscription</strong> in the app, which opens Apple&apos;s subscription management.</li>
        <li>Cancelling stops future renewals but doesn&apos;t revoke redesigns already granted, and access continues until the current billing period ends.</li>
        <li>All payments are processed by Apple under its own terms; refund requests go through Apple, not us.</li>
        <li>We may change plan pricing or the number of redesigns a plan includes going forward; changes won&apos;t reduce what you&apos;ve already been granted.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Room Redo for anything illegal, or to generate or upload content that&apos;s abusive, infringing, or violates someone else&apos;s rights;</li>
        <li>Attempt to disrupt, reverse-engineer, or abuse the app, its generation pipeline, or its backend systems;</li>
        <li>Circumvent the redesign balance or purchase system.</li>
      </ul>
      <p>We may suspend or terminate access for accounts (device identifiers) that violate these terms.</p>

      <h2>No warranty</h2>
      <p>
        Room Redo is provided &quot;as is.&quot; AI-generated results can be inaccurate, unrealistic, or
        occasionally fail to generate — we don&apos;t guarantee any particular output, availability, or that
        the service will be uninterrupted or error-free.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, we&apos;re not liable for indirect, incidental, or consequential
        damages arising from your use of the app, including decisions made based on a generated redesign.
        Our total liability for any claim is limited to the amount you paid us in the 12 months before the
        claim arose.
      </p>

      <h2>Changes to the app or these terms</h2>
      <p>
        We may update Room Redo or these terms over time. If we make a material change to the terms,
        we&apos;ll update the effective date above. Continued use after a change means you accept the updated
        terms.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Poland, without regard to conflict-of-law rules, except where local consumer-protection law requires otherwise.</p>

      <h2>Contact</h2>
      <p>
        Room Redo AI, operated by Aleksander Walkowski, Poland. Email{" "}
        <a href="mailto:support@airoomredo.com">support@airoomredo.com</a> with any questions about these terms.
      </p>
    </LegalLayout>
  );
}
