import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalList, LegalPage, LegalSection } from '@/components/landing/legal-page'
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from '@/lib/landing/content'
import { getDeliveryZones } from '@/lib/landing/stats'
import { DELIVERY_WINDOW_DAYS } from '@/lib/rental/config'

export const metadata: Metadata = {
  title: 'Delivery & Returns | Relaks',
  description: 'Delivery zones, fees and times in Lagos, delivery outside Lagos, and our returns policy.',
}

// Zones come from the database; refresh hourly
export const revalidate = 3600

function formatDays(min: number, max: number) {
  if (min === max) return `${min} working day${min === 1 ? '' : 's'}`
  return `${min}–${max} working days`
}

export default async function DeliveryReturnsPage() {
  const zones = await getDeliveryZones()

  return (
    <LegalPage
      title="Delivery & Returns"
      lastUpdated={LEGAL_LAST_UPDATED.deliveryReturns}
      intro={<p>How we get your books to you, and what to do if something isn&apos;t right.</p>}
    >
      <LegalSection title="Delivery in Lagos">
        {/* TODO: confirm - dispatch timing and courier details */}
        <p>
          We deliver shop orders across Lagos. Your delivery fee depends on your area and is shown at checkout. Delivery
          times count from when your order is confirmed.
        </p>
        {zones.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-900">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Zone</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Fee</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Delivery time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {zones.map((zone) => (
                  <tr key={zone.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{zone.name}</p>
                      {zone.areas.length > 0 && (
                        <p className="text-gray-600 mt-1">{zone.areas.join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">&#8358;{zone.fee_naira.toLocaleString('en-US')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDays(zone.min_days, zone.max_days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Delivery fees and times for your area are shown at checkout.</p>
        )}
        {/* TODO: confirm - Reading Club delivery fee and window */}
        <p>
          Reading Club rentals are delivered within Lagos, usually within {DELIVERY_WINDOW_DAYS.replace('-', '–')}{' '}
          days. Any delivery fee for your plan is shown at checkout.
        </p>
      </LegalSection>

      <LegalSection title="Outside Lagos">
        {/* TODO: confirm */}
        <p>
          Outside Lagos, you can buy Relaks books from our distributors in your city. Each one sets their own delivery
          options and fees. Find a distributor near you on our{' '}
          <Link href="/shop#distributors">shop page</Link> and message them on WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="Damaged or wrong items">
        {/* TODO: confirm - reporting window and whether photos are required */}
        <p>
          If your order arrives damaged, or we sent the wrong item, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> within 48 hours of delivery with your order number
          and a photo. We will send a replacement or refund you, including the delivery fee.
        </p>
      </LegalSection>

      <LegalSection title="Returns">
        {/* TODO: confirm - return window, condition, who pays return delivery, refund timing */}
        <LegalList>
          <li>You can return unused items in their original condition within 7 days of delivery.</li>
          <li>Coloring books that have been colored in can&apos;t be returned unless they arrived faulty.</li>
          <li>Unless the item was faulty, you pay for return delivery.</li>
          <li>Refunds go back to your original payment method within 5–10 working days of us receiving the item.</li>
        </LegalList>
        {/* TODO: confirm */}
        <p>
          Reading Club books are rentals and follow the return rules in the{' '}
          <Link href="/rent/terms">Reading Club Terms</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll help.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
