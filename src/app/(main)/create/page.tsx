import { Header } from '@/components/layout/header'
import { CreateContent } from '@/components/create/create-content'

export const metadata = {
  title: 'Create | Relaks',
  description: 'Upload your artwork or generate AI coloring pages',
}

export default function CreatePage() {
  return (
    <>
      <Header title="Create" showSearch={false} />
      <main className="max-w-lg mx-auto">
        <CreateContent />
      </main>
    </>
  )
}
