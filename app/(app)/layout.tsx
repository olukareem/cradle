import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/shell/AppShell'
import { SessionProvider } from '@/components/shell/SessionProvider'
import { SidebarContent } from '@/components/rooms/SidebarContent'
import { MembersPanel } from '@/components/presence/MembersPanel'
import { UserProfileCorner } from '@/components/shell/UserProfileCorner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  // Fetch the user's profile and joined rooms in parallel
  const [profileResult, roomsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('room_members')
      .select('rooms(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true }),
  ])

  const profile = profileResult.data ?? null
  const joinedRooms =
    roomsResult.data?.flatMap((m) => (m.rooms ? [m.rooms] : [])) ?? []

  return (
    <SessionProvider user={user} profile={profile}>
      <AppShell
        sidebar={
          <>
            <SidebarContent initialRooms={joinedRooms} />
            <UserProfileCorner />
          </>
        }
        main={children}
        rail={<MembersPanel />}
      />
    </SessionProvider>
  )
}
