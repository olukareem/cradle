/**
 * RLS sanity test — verifies Row Level Security denies unauthorized access.
 *
 * Setup:
 *   Alice   → member of rooms 'a255098f' (general) and '05935259' (random)
 *   Bob     → member of room 'a255098f' ONLY (NOT '05935259')
 *   anon    → no auth at all
 *
 * Assertions:
 *   1. anon CANNOT read messages from any room
 *   2. anon CANNOT insert messages
 *   3. Bob CANNOT read messages from '05935259' (he's not a member)
 *   4. Bob CANNOT insert messages into '05935259'
 *   5. Bob CANNOT edit Alice's messages
 *   6. Bob CANNOT soft-delete Alice's messages
 *   7. Alice CAN read her own rooms' messages (positive control)
 */
import { createClient } from '@supabase/supabase-js'

// Run with: node --env-file=.env.local scripts/rls-test.mjs
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON_KEY || !SERVICE_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY')

const ROOM_A255 = 'a255098f-906e-43dd-9fde-6c6e619fa03e' // Alice + Bob
const ROOM_RANDOM = '05935259-2811-4fe1-83f0-1f5af9a92f5a' // Alice only

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', Z = '\x1b[0m'
let passed = 0, failed = 0
const ok = (l) => { console.log(`${G}  PASS${Z}  ${l}`); passed++ }
const fail = (l, d = '') => { console.log(`${R}  FAIL${Z}  ${l}${d ? ' — ' + d : ''}`); failed++ }
const info = (m) => console.log(`${C}  ....${Z}  ${m}`)

async function signIn(email, password) {
  const c = createClient(URL, ANON_KEY)
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in ${email}: ${error.message}`)
  return { client: c, user: data.user }
}

async function main() {
  console.log(`\n${C}Cradle — RLS Sanity Test${Z}\n`)

  // ── Setup: Alice seeds a message into her "solo" room (random) ─────────
  console.log(`${Y}[setup]${Z}`)
  const alice = await signIn('alice@example.com', 'test-alice-pw-2025')
  info('Alice signed in')
  const bob = await signIn('bob@example.com', 'test-bob-pw-2025')
  info('Bob signed in')

  const seedContent = `rls-seed-${Date.now()}`
  const { data: seedRow, error: seedErr } = await alice.client
    .from('messages')
    .insert({ room_id: ROOM_RANDOM, user_id: alice.user.id, content: seedContent })
    .select('id')
    .single()
  if (seedErr) {
    console.log(`${R}FATAL${Z}  Could not seed message: ${seedErr.message}`)
    process.exit(1)
  }
  info(`Alice seeded message ${seedRow.id} in ${ROOM_RANDOM}`)

  // ── 1. anon cannot read messages ───────────────────────────────────────
  console.log(`\n${Y}[1] anon (no JWT) SELECT on messages${Z}`)
  const anonClient = createClient(URL, ANON_KEY)
  const { data: anonMsgs, error: anonErr } = await anonClient
    .from('messages')
    .select('id,content')
  if (anonErr) {
    ok(`anon SELECT denied with error: ${anonErr.code ?? anonErr.message}`)
  } else if (anonMsgs.length === 0) {
    ok('anon SELECT returns 0 rows (RLS filters all rows)')
  } else {
    fail(`anon SELECT leaked ${anonMsgs.length} rows`, JSON.stringify(anonMsgs.slice(0, 2)))
  }

  // ── 2. anon cannot insert messages ─────────────────────────────────────
  console.log(`\n${Y}[2] anon INSERT on messages${Z}`)
  const { error: anonInsErr } = await anonClient
    .from('messages')
    .insert({ room_id: ROOM_A255, user_id: alice.user.id, content: 'anon-attempt' })
  if (anonInsErr) {
    ok(`anon INSERT denied: ${anonInsErr.code ?? anonInsErr.message}`)
  } else {
    fail('anon INSERT was permitted — RLS hole!')
  }

  // ── 3. Bob cannot SELECT messages from room he's not in ────────────────
  console.log(`\n${Y}[3] Bob SELECT on room he's not a member of${Z}`)
  const { data: bobSelect, error: bobSelErr } = await bob.client
    .from('messages')
    .select('id,content')
    .eq('room_id', ROOM_RANDOM)
  if (bobSelErr) {
    ok(`Bob SELECT denied with error: ${bobSelErr.code ?? bobSelErr.message}`)
  } else if (bobSelect.length === 0) {
    ok(`Bob SELECT on ${ROOM_RANDOM} returns 0 rows (RLS filter)`)
  } else {
    fail(`Bob saw ${bobSelect.length} messages in a room he's not in`, JSON.stringify(bobSelect))
  }

  // ── 4. Bob cannot INSERT into room he's not in ─────────────────────────
  console.log(`\n${Y}[4] Bob INSERT into room he's not in${Z}`)
  const { error: bobInsErr } = await bob.client
    .from('messages')
    .insert({ room_id: ROOM_RANDOM, user_id: bob.user.id, content: 'bob-intrusion' })
  if (bobInsErr) {
    ok(`Bob INSERT denied: ${bobInsErr.code ?? bobInsErr.message}`)
  } else {
    fail('Bob INSERT into non-member room was permitted — RLS hole!')
  }

  // ── 5. Bob cannot edit Alice's messages ────────────────────────────────
  console.log(`\n${Y}[5] Bob UPDATE Alice's message${Z}`)
  // Seed a message by Alice in the shared room (a255098f)
  const { data: aliceMsg, error: seedErr2 } = await alice.client
    .from('messages')
    .insert({ room_id: ROOM_A255, user_id: alice.user.id, content: `alice-owns-${Date.now()}` })
    .select('id,content')
    .single()
  if (seedErr2) {
    fail('Seed Alice message in shared room', seedErr2.message)
  } else {
    info(`Alice seeded ${aliceMsg.id} in shared room`)

    const { data: updateRows, error: bobUpdErr } = await bob.client
      .from('messages')
      .update({ content: 'hacked-by-bob' })
      .eq('id', aliceMsg.id)
      .select()
    if (bobUpdErr) {
      ok(`Bob UPDATE denied: ${bobUpdErr.code ?? bobUpdErr.message}`)
    } else if (!updateRows || updateRows.length === 0) {
      // RLS filters the UPDATE — no rows matched under Bob's USING clause
      ok('Bob UPDATE affected 0 rows (RLS USING clause filtered the row out)')
    } else {
      fail(`Bob UPDATE succeeded on Alice's message`, JSON.stringify(updateRows))
    }

    // Double-check by reading back as service role
    const sv = createClient(URL, SERVICE_KEY)
    const { data: check } = await sv.from('messages').select('content').eq('id', aliceMsg.id).single()
    if (check?.content === 'hacked-by-bob') {
      fail('Message WAS actually modified despite Bob getting no rows back — RLS hole!')
    } else {
      ok(`Server-side check: message content is still "${check?.content}"`)
    }

    // ── 6. Bob cannot soft-delete Alice's messages ──────────────────────
    console.log(`\n${Y}[6] Bob soft-delete (UPDATE deleted_at) Alice's message${Z}`)
    const { data: bobDelRows, error: bobDelErr } = await bob.client
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', aliceMsg.id)
      .select()
    if (bobDelErr) {
      ok(`Bob soft-delete denied: ${bobDelErr.code ?? bobDelErr.message}`)
    } else if (!bobDelRows || bobDelRows.length === 0) {
      ok('Bob soft-delete affected 0 rows (RLS filtered)')
    } else {
      fail(`Bob soft-delete succeeded on Alice's message`, JSON.stringify(bobDelRows))
    }

    const { data: check2 } = await sv.from('messages').select('deleted_at').eq('id', aliceMsg.id).single()
    if (check2?.deleted_at !== null) {
      fail('Message WAS actually soft-deleted — RLS hole!')
    } else {
      ok('Server-side check: deleted_at is still null')
    }
  }

  // ── 7. Positive control: Alice CAN read her own rooms' messages ───────
  console.log(`\n${Y}[7] Positive control — Alice SELECT on her rooms${Z}`)
  const { data: aliceRead, error: aliceReadErr } = await alice.client
    .from('messages')
    .select('id,content')
    .eq('room_id', ROOM_RANDOM)
  if (aliceReadErr) fail('Alice could NOT read her own room', aliceReadErr.message)
  else if (aliceRead.some((m) => m.content === seedContent)) {
    ok(`Alice sees her own seed message in ${ROOM_RANDOM}`)
  } else {
    fail('Alice did NOT see her own seed message', `got ${aliceRead.length} rows`)
  }

  // ── 8. Bob CAN read shared room ──────────────────────────────────────
  console.log(`\n${Y}[8] Positive control — Bob SELECT on shared room${Z}`)
  const { data: bobRead, error: bobReadErr } = await bob.client
    .from('messages')
    .select('id,content')
    .eq('room_id', ROOM_A255)
    .limit(5)
  if (bobReadErr) fail('Bob could NOT read shared room', bobReadErr.message)
  else ok(`Bob can read shared room (${bobRead.length} messages visible)`)

  // ── Summary ────────────────────────────────────────────────────────────
  const divider = '─'.repeat(50)
  console.log(`\n${divider}`)
  console.log(`${G}Passed: ${passed}${Z}   ${failed > 0 ? R : G}Failed: ${failed}${Z}`)
  console.log(divider + '\n')
  if (failed > 0) process.exit(1)
}

main().catch((e) => { console.error(R + 'Fatal: ' + e.message + Z); process.exit(1) })
