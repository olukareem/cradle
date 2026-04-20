import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignInForm } from '@/components/auth/SignInForm'

export const metadata: Metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text">Cradle</h1>
        <p className="mt-1.5 text-sm text-text-muted">Sign in to your account</p>
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  )
}
