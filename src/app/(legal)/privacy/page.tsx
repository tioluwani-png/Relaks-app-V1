import type { Metadata } from 'next'
import { LegalList, LegalPage, LegalSection } from '@/components/landing/legal-page'
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from '@/lib/landing/content'

export const metadata: Metadata = {
  title: 'Privacy Policy | Relaks',
  description: 'How Relaks collects, uses and protects your personal information.',
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED.privacy}
      intro={
        // TODO: confirm - legal entity name and registered address
        <p>
          This policy explains what personal information Relaks (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when
          you use our website, app, shop and Reading Club, why we collect it, and the choices you have.
        </p>
      }
    >
      <LegalSection title="What we collect">
        {/* TODO: confirm - complete list of data collected */}
        <LegalList>
          <li><strong>Account details:</strong> your name, username, email address and profile photo. If you sign up with Google, we receive your name, email and profile picture from Google.</li>
          <li><strong>Content you create:</strong> artwork you upload, posts, comments, likes, reading lists, reviews and journal entries.</li>
          <li><strong>Orders and deliveries:</strong> your name, phone number and delivery address when you buy from the shop or join the Reading Club.</li>
          <li><strong>Payments:</strong> a payment reference and the amount paid. Card and bank details are entered on Paystack and never reach our servers.</li>
          <li><strong>Usage data:</strong> anonymous page-view statistics through Vercel Analytics, which does not use cookies to track you across sites.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Why we use it">
        {/* TODO: confirm - purposes and legal bases (NDPA 2023 / UK GDPR where relevant) */}
        <LegalList>
          <li>To create and run your account and show your content to the community.</li>
          <li>To process orders, rentals and payments, and deliver books to you.</li>
          <li>To send you emails about your account and orders, and, if you agree, news and offers.</li>
          <li>To keep the community safe, including reviewing reported content.</li>
          <li>To understand how Relaks is used so we can improve it.</li>
        </LegalList>
        {/* TODO: confirm - journal entries are private and never shown to other users */}
        <p>Your journal entries are private to you. We do not sell your personal information.</p>
      </LegalSection>

      <LegalSection title="Payments via Paystack">
        {/* TODO: confirm */}
        <p>
          All payments are processed by Paystack. When you pay, you enter your card or bank details directly with
          Paystack, and their privacy policy applies to that information. We receive confirmation that a payment
          succeeded, its reference and amount, which we keep for our accounting records.
        </p>
      </LegalSection>

      <LegalSection title="Emails via Resend">
        {/* TODO: confirm - Mailchimp is also used for marketing emails; confirm wording and opt-out flow */}
        <p>
          We send account and order emails, such as receipts and delivery updates, through Resend. Marketing emails
          are sent through Mailchimp, and every marketing email has an unsubscribe link.
        </p>
      </LegalSection>

      <LegalSection title="Who else processes your data">
        {/* TODO: confirm - full list of processors */}
        <p>
          We use trusted providers to run Relaks: Supabase (database, accounts and file storage), Vercel (hosting and
          analytics), Paystack (payments), Resend and Mailchimp (email), and OpenAI (to generate AI coloring pages from
          the prompts you write). Our delivery partners and distributors receive the name, phone number and address
          needed to deliver your order.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        {/* TODO: confirm - retention periods */}
        <p>
          We keep your account information for as long as your account is open. Order and payment records are kept
          for as long as we are required to for tax and accounting purposes. When you delete your account, we delete
          or anonymise your personal information unless we need to keep it by law.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        {/* TODO: confirm - rights under the Nigeria Data Protection Act 2023 and how requests are handled */}
        <p>You can ask us to:</p>
        <LegalList>
          <li>give you a copy of the personal information we hold about you;</li>
          <li>correct information that is wrong;</li>
          <li>delete your account and personal information;</li>
          <li>stop sending you marketing emails at any time.</li>
        </LegalList>
        <p>
          If you are unhappy with how we handle your data, you can also complain to the Nigeria Data Protection
          Commission or the data protection authority where you live.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        {/* TODO: confirm - contact address for privacy requests */}
        <p>
          For any privacy question or request, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to
          reply within 30 days.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
