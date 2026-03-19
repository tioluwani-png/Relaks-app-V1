import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = {
  title: 'Login | Relaks',
  description: 'Sign in to your Relaks account',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
