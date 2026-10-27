import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalList, LegalPage, LegalSection } from '@/components/landing/legal-page'
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from '@/lib/landing/content'
import {
  DEFAULT_REPLACEMENT_VALUE_NAIRA,
  UNRETURNED_DAYS_THRESHOLD,
} from '@/lib/rental/config'

export const metadata: Metadata = {
  title: 'Terms of Service | Relaks',
  description: 'The terms for using the Relaks app, shop and Reading Club.',
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated={LEGAL_LAST_UPDATED.terms}
      intro={
        // TODO: confirm - legal entity name and governing law
        <p>
          These terms apply when you use the Relaks website, app, shop and Reading Club. By creating an account or
          placing an order, you agree to them.
        </p>
      }
    >
      <LegalSection title="Your account">
        {/* TODO: confirm - minimum age */}
        <LegalList>
          <li>You must be at least 16 years old to create an account.</li>
          <li>Keep your login details safe. You are responsible for what happens on your account.</li>
          <li>Give accurate information, especially your delivery address and phone number.</li>
          <li>You can delete your account at any time from your profile settings or by emailing us.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Credits and refunds">
        {/* TODO: confirm - credit expiry and refund policy */}
        <p>
          Some features, such as AI-generated pages and premium designs, use credits that you buy through Paystack.
          Credits are added to your account as soon as payment is confirmed. They have no cash value and cannot be
          transferred to another account.
        </p>
        {/* TODO: confirm */}
        <p>
          Because credits are delivered instantly, we don&apos;t usually refund credits you have used. If you were
          charged but didn&apos;t receive your credits, or were charged twice, email us with your payment reference
          and we will fix it or refund you.
        </p>
      </LegalSection>

      <LegalSection title="Community rules">
        {/* TODO: confirm */}
        <p>Relaks is a calm, kind space. When you post, comment or review, please:</p>
        <LegalList>
          <li>only upload artwork you colored or have the right to share;</li>
          <li>be respectful. No harassment, hate speech, or sexual or violent content;</li>
          <li>don&apos;t spam, advertise or impersonate others.</li>
        </LegalList>
        {/* TODO: confirm */}
        <p>
          You keep ownership of what you post. You give us permission to display it on Relaks so the community can
          see it. We may remove content or suspend accounts that break these rules.
        </p>
      </LegalSection>

      <LegalSection title="Reading Club rental terms">
        {/* TODO: confirm - summary must match /rent/terms */}
        <p>
          The Reading Club lets you rent books for a set period on a paid plan. Books must be returned in good
          condition by the end of your rental. If a book is lost, badly damaged, or not returned within{' '}
          {UNRETURNED_DAYS_THRESHOLD} days of your rental ending, we may charge its replacement value (up to
          &#8358;{DEFAULT_REPLACEMENT_VALUE_NAIRA.toLocaleString('en-US')} per book where no specific value is set).
        </p>
        <p>
          The full rental terms, which you accept at checkout, are on the{' '}
          <Link href="/rent/terms">Reading Club Terms</Link> page.
        </p>
      </LegalSection>

      <LegalSection title="Shop orders">
        {/* TODO: confirm */}
        <p>
          Prices are in Naira and include VAT where it applies. Delivery fees and times are shown at checkout and on
          our <Link href="/delivery-returns">Delivery &amp; Returns</Link> page.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        {/* TODO: confirm - liability cap and governing law with a lawyer */}
        <p>
          We work hard to keep Relaks running smoothly, but we provide the app &ldquo;as is&rdquo; and can&apos;t promise
          it will always be available or error-free. Relaks supports relaxation and wellbeing; it is not a substitute
          for medical or mental health care.
        </p>
        {/* TODO: confirm */}
        <p>
          As far as the law allows, we are not liable for indirect losses, and our total liability to you is limited
          to the amount you paid us in the 12 months before the claim. Nothing in these terms limits rights you have
          under consumer protection law.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        {/* TODO: confirm */}
        <p>
          We may update these terms. If the changes are significant, we will tell you by email or in the app. Questions?
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
