import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignUpForm } from '@/components/auth/SignUpForm'

export const metadata: Metadata = { title: 'Create account' }

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text">Cradle</h1>
        <p className="mt-1.5 text-sm text-text-muted">Create your account</p>
      </div>
      <Suspense>
        <SignUpForm />
      </Suspense>
    </div>
  )
}
