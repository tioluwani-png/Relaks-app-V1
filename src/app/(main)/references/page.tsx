import { Header } from '@/components/layout/header'
import { ReferencesContent } from '@/components/discover/references-content'

export const metadata = {
  title: 'Color References | Relaks',
  description: 'Find color inspiration for your Relaks coloring books',
}

export default function ReferencesPage() {
  return (
    <>
      <Header title="References" showSearch={false} />
      <main className="max-w-lg mx-auto">
        <ReferencesContent />
      </main>
    </>
  )
}
