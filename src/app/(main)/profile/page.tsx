import { Header } from '@/components/layout/header'
import { ProfileContent } from '@/components/profile/profile-content'

export const metadata = {
  title: 'Profile | Relaks',
  description: 'View your profile and posts',
}

export default function ProfilePage() {
  return (
    <>
      <Header title="Profile" showSearch={false} />
      <main className="max-w-lg mx-auto">
        <ProfileContent />
      </main>
    </>
  )
}
