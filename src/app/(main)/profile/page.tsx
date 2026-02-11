'use client'

import { Header } from '@/components/layout/header'
import { ProfileContent } from '@/components/profile/profile-content'
import { useAuth } from '@/hooks/use-auth'

export default function ProfilePage() {
  const { profile } = useAuth()

  return (
    <>
      <Header
        title={profile?.username ? `@${profile.username}` : 'Profile'}
        showSearch={false}
      />
      <main className="max-w-lg mx-auto">
        <ProfileContent />
      </main>
    </>
  )
}
