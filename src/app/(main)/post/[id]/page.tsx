import { PostDetail } from '@/components/feed/post-detail'

interface PostPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PostPageProps) {
  const { id } = await params
  return {
    title: `Post | Relaks`,
    description: `View post ${id} on Relaks`,
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params
  return <PostDetail postId={id} />
}
