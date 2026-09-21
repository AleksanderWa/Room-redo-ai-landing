import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Room Redo AI",
  description: "How Room Redo AI collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

const EFFECTIVE_DATE = "21 September 2026";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <p>
        Room Redo AI (&quot;Room Redo,&quot; &quot;we,&quot; &quot;us&quot;) is operated by Aleksander Walkowski,
        based in Poland. This policy explains what the Room Redo iOS app and this website collect, why,
        and who we share it with. If you have questions, email{" "}
        <a href="mailto:support@airoomredo.com">support@airoomredo.com</a>.
      </p>

      <h2>No account, no name, no email required</h2>
      <p>
        Room Redo has no sign-up. The first time you open the app, it generates a random device identifier
        and stores it in your device&apos;s secure keychain. That identifier — not a name, email, or phone
        number — is how the app recognizes your rooms and redesigns across sessions. We never ask for your
        real identity to use the app.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Device identifier.</strong> A random UUID generated on-device, used to associate your
          rooms, redesign balance, and subscription status with your device.
        </li>
        <li>
          <strong>Room photos.</strong> The photo you capture or choose from your library, and the
          redesigned images generated from it. These are uploaded to our storage to generate and display
          your results.
        </li>
        <li>
          <strong>Purchase and subscription status.</strong> Whether you&apos;re subscribed, which plan,
          and your redesign balance. Payment itself is handled entirely by the Apple App Store — we never
          see or store your card details.
        </li>
        <li>
          <strong>Basic usage events.</strong> App actions tied to your device identifier (e.g. a photo
          was captured, a redesign completed, the paywall was shown), used to understand and improve the
          product. Not tied to your name or contact details.
        </li>
        <li>
          <strong>Support correspondence.</strong> If you email support, we receive your email address and
          whatever you send us — including your app version and device identifier, which the app prefills
          to help us help you faster.
        </li>
      </ul>
      <p>We do not collect your precise location, contacts, or health data, and we do not request camera-roll access beyond the single photo you choose to use.</p>

      <h2>Who we share it with</h2>
      <p>We use a small number of service providers to run Room Redo. Each only receives what it needs to do its job:</p>
      <ul>
        <li><strong>Cloudflare R2</strong> — stores your room and redesign photos.</li>
        <li><strong>fal.ai</strong> — processes your room photo to generate the redesigned image.</li>
        <li><strong>OpenAI</strong> — used to automatically check that a submitted photo is a usable room photo before generation.</li>
        <li><strong>RevenueCat</strong> and the <strong>Apple App Store</strong> — manage your purchase and subscription status.</li>
        <li><strong>Sentry</strong> — crash and error reporting, when enabled, to help us fix bugs.</li>
        <li><strong>Vercel</strong> — hosts this website. Vercel Analytics collects standard, anonymized page-view analytics on this website only (not the app).</li>
        <li><strong>Supabase</strong> — stores the email address you submit to this website&apos;s waitlist, if you join it.</li>
      </ul>
      <p>
        We do not sell your data, and we do not use it for third-party advertising or cross-app tracking.
        We may disclose information if required by law, or to investigate fraud or abuse of the service.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Room photos and redesigns are kept for as long as the room exists in the app. Deleting a room from
        within the app deletes its photos from our storage.
      </p>
      <p>
        To remove everything tied to your device, use <strong>Delete my data</strong> in the app&apos;s Settings.
        This deactivates your device immediately — your spaces are no longer accessible in the app. Stored
        copies may be retained until a later deletion pass; email{" "}
        <a href="mailto:support@airoomredo.com">support@airoomredo.com</a> with your device identifier if
        you need an earlier wipe. Deleting your data does not cancel an App Store subscription — cancel that
        separately in your Apple subscription settings.
      </p>

      <h2>Your rights</h2>
      <p>
        If you&apos;re in the EU/EEA or UK, you have rights under GDPR to access, correct, export, or delete
        your data, and to object to or restrict certain processing. Use <strong>Delete my data</strong> in
        Settings for deletion, or email <a href="mailto:support@airoomredo.com">support@airoomredo.com</a>{" "}
        with your device identifier for other requests. Wherever you are, you can reach us at{" "}
        <a href="mailto:support@airoomredo.com">support@airoomredo.com</a> for any privacy request.
      </p>

      <h2>Children</h2>
      <p>Room Redo is not directed at children under 16, and we do not knowingly collect data from them.</p>

      <h2>Changes to this policy</h2>
      <p>
        If we make a material change to this policy, we&apos;ll update the effective date above and, where
        appropriate, note it in the app.
      </p>

      <h2>Contact</h2>
      <p>
        Room Redo AI, operated by Aleksander Walkowski, Poland. Email{" "}
        <a href="mailto:support@airoomredo.com">support@airoomredo.com</a> for anything privacy-related.
      </p>
    </LegalLayout>
  );
}
