import { Header } from '@/components/layout/header'
import { FeedContent } from '@/components/feed/feed-content'

export const metadata = {
  title: 'Feed | Relaks',
  description: 'See the latest from the Relaks community',
}

export default function FeedPage() {
  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto">
        <FeedContent />
      </main>
    </>
  )
}
