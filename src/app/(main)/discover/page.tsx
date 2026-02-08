import { Header } from '@/components/layout/header'
import { DiscoverContent } from '@/components/discover/discover-content'

export const metadata = {
  title: 'Discover | Relaks',
  description: 'Explore references, coloring pages, and more',
}

export default function DiscoverPage() {
  return (
    <>
      <Header title="Discover" />
      <main className="max-w-lg mx-auto">
        <DiscoverContent />
      </main>
    </>
  )
}
