'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        // Try logging in immediately (works if email confirmation is disabled)
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
        if (!loginErr) {
          router.push(next)
          router.refresh()
        } else {
          setSuccess(true)
        }
      }
    })
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-text">Check your email</p>
        <p className="text-sm text-text-muted">
          We sent a confirmation link to <span className="text-text">{email}</span>. Click it to
          activate your account.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          required
          minLength={2}
          maxLength={32}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="yourhandle"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8+ characters"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link
          href={`/sign-in${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-accent hover:text-accent-hover underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
