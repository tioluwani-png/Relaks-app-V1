import { BlogHeader } from '@/components/blog/blog-header'
import { BlogSubmissionForm } from '@/components/blog/blog-submission-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Submit Your Story | Relaks Blog',
  description: 'Share your story, rant, or inspiration with the Relaks community. Submissions are reviewed before publishing.',
  openGraph: {
    title: 'Submit Your Story | Relaks Blog',
    description: 'Share your story, rant, or inspiration with the Relaks community.',
    type: 'website',
  },
}

export default function BlogSubmitPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF5' }}>
      <BlogHeader showBackToBlog />
      <BlogSubmissionForm />
    </div>
  )
}
