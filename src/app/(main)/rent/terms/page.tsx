'use client'

import Link from 'next/link'
import { ArrowLeft, BookOpen, Heart, Shield, RefreshCw, CreditCard, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  TERMS_VERSION,
  DEFAULT_REPLACEMENT_VALUE_NAIRA,
  UNRETURNED_DAYS_THRESHOLD,
  MAX_COLLECTION_ATTEMPTS,
} from '@/lib/rental/config'

export default function RentalTermsPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#FFFBF5]/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/rent"
              className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Reading Club Terms</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Intro */}
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl p-6 border border-purple-100">
            <p className="text-gray-700 leading-relaxed">
              <strong>Plain-English summary</strong> — this is the agreement you accept when renting
              from the Relaks Reading Club. We&apos;ve kept it simple and human because that&apos;s
              how we do things here.
            </p>
            <p className="text-sm text-gray-500 mt-3">
              Version: {TERMS_VERSION}
            </p>
          </div>

          {/* Section 1: What you're agreeing to */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">What you&apos;re agreeing to</h2>
            </div>
            <div className="pl-13 space-y-3 text-gray-700 leading-relaxed">
              <p>
                When you rent books through the Relaks Reading Club, you&apos;re borrowing them —
                not buying them. The books remain the property of Relaks (or our partner publishers).
              </p>
              <p>
                Your subscription gives you the right to read and enjoy the books for the duration
                of your rental period. Think of it like a library, but with delivery to your door.
              </p>
            </div>
          </section>

          {/* Section 2: Care of books */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Care of books</h2>
            </div>
            <div className="pl-13 space-y-3 text-gray-700 leading-relaxed">
              <p>
                We expect you to treat the books with reasonable care. A few dog-eared pages or
                minor shelf wear? Totally fine — that&apos;s normal reading wear.
              </p>
              <p>
                What counts as damage:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Water damage (stains, warping, mold)</li>
                <li>Torn or missing pages</li>
                <li>Missing or heavily damaged covers</li>
                <li>Excessive writing, highlighting, or staining</li>
                <li>Damage that makes the book unsuitable for the next reader</li>
              </ul>
              <p>
                Basically, if another reader wouldn&apos;t enjoy receiving the book, that&apos;s a problem.
              </p>
            </div>
          </section>

          {/* Section 3: Loss and damage */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Loss and damage</h2>
            </div>
            <div className="pl-13 space-y-3 text-gray-700 leading-relaxed">
              <p>
                If a book is lost or damaged beyond re-lending, we&apos;ll charge you the replacement
                cost. This is:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The replacement value shown on each book&apos;s page, OR</li>
                <li>
                  ₦{DEFAULT_REPLACEMENT_VALUE_NAIRA.toLocaleString()} if no specific value is listed
                </li>
              </ul>
              <p>
                We&apos;ll always let you know before charging anything, and we&apos;ll work with you
                if there&apos;s a genuine dispute about the book&apos;s condition.
              </p>
            </div>
          </section>

          {/* Section 4: Returns and collection */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Returns and collection</h2>
            </div>
            <div className="pl-13 space-y-3 text-gray-700 leading-relaxed">
              <p>
                At the end of your rental period, our rider will come to collect your books.
                We&apos;ll reach out to schedule a convenient time.
              </p>
              <p>
                If we attempt collection {MAX_COLLECTION_ATTEMPTS} times and can&apos;t reach you or
                you&apos;re unavailable, the books will be treated as unreturned. Please make sure
                you&apos;re available or have arranged for someone to hand over the books.
              </p>
            </div>
          </section>

          {/* Section 5: Unreturned books */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Unreturned books</h2>
            </div>
            <div className="pl-13 space-y-3 text-gray-700 leading-relaxed">
              <p>
                If {UNRETURNED_DAYS_THRESHOLD} days pass after your rental expires and we still
                haven&apos;t been able to collect the books:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  The replacement value may be charged to your saved payment card
                </li>
                <li>
                  Your account may be suspended from future rentals until the matter is resolved
                </li>
              </ul>
              <p>
                We don&apos;t want this to happen — it&apos;s a last resort. If you&apos;re having
                trouble returning books, please reach out and we&apos;ll figure it out together.
              </p>
            </div>
          </section>

          {/* Section 6: Cancellations */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Cancellations</h2>
            </div>
            <div className="pl-13 space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>Before dispatch:</strong> Full refund, no questions asked. Life happens.
              </p>
              <p>
                <strong>After delivery:</strong> No refund on the rental fee (the books are already
                with you!). But you can still swap books according to your plan if you change your
                mind about what you&apos;re reading.
              </p>
            </div>
          </section>

          {/* Section 7: Payments and renewal */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Payments and renewal</h2>
            </div>
            <div className="pl-13 space-y-3 text-gray-700 leading-relaxed">
              <p>
                <strong>Auto-renew:</strong> If you turn on auto-renew, we&apos;ll charge your saved
                card on the day your rental expires. You can cancel auto-renew anytime before that
                date — no penalties, no hassle.
              </p>
              <p>
                <strong>Saved cards:</strong> When you pay for a rental, we securely save your payment
                card for auto-renewal and (in the case of lost/damaged books) replacement charges.
                Your full card details are never stored on our servers — they&apos;re handled by
                Paystack.
              </p>
              <p>
                <strong>Manual renewal:</strong> If auto-renew is off, we&apos;ll remind you a week
                before your rental ends. You can renew manually anytime in the last 7 days.
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 leading-relaxed">
              Questions about these terms? Just reach out to us at{' '}
              <a href="mailto:hello@relaks.co" className="text-purple-600 hover:underline">
                hello@relaks.co
              </a>
              . We&apos;re happy to explain anything in more detail.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Last updated: August 2026
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
