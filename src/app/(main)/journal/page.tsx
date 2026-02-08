import { Header } from '@/components/layout/header'
import { JournalContent } from '@/components/journal/journal-content'

export const metadata = {
  title: 'Journal | Relaks',
  description: 'Track your wellness journey with daily journaling',
}

export default function JournalPage() {
  return (
    <>
      <Header title="Journal" showSearch={false} />
      <main className="max-w-lg mx-auto">
        <JournalContent />
      </main>
    </>
  )
}
