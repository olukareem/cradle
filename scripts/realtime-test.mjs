/**
 * End-to-end realtime test — no browser required.
 * Tests: message INSERT, UPDATE (edit), soft-delete, presence, typing, leave.
 * Run: node scripts/realtime-test.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cwpabnehcjfgythyqcqb.supabase.co'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cGFibmVoY2pmZ3l0aHlxY3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Mjc2MzgsImV4cCI6MjA5MjIwMzYzOH0.afGPmroG2BePZl8DNWn5bXUs-Ms44Lv0r68TaIkK14s'
const ROOM_ID = 'a255098f-906e-43dd-9fde-6c6e619fa03e'

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', Z = '\x1b[0m'
let passed = 0, failed = 0

function ok(label) { console.log(`${G}  PASS${Z}  ${label}`); passed++ }
function fail(label, d = '') { console.log(`${R}  FAIL${Z}  ${label}${d ? ' — ' + d : ''}`); failed++ }
function info(msg) { console.log(`${C}  ....${Z}  ${msg}`) }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function timeout(p, ms, label) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout ${ms}ms: ${label}`)), ms))])
}

async function signIn(email, password) {
  const c = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in ${email}: ${error.message}`)
  return { client: c, user: data.user }
}

async function main() {
  console.log(`\n${C}Cradle Realtime Test${Z}  room=${ROOM_ID}\n`)

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  console.log(`${Y}[1] Auth${Z}`)
  let alice, bob
  try { alice = await signIn('alice@example.com', 'test-alice-pw-2025'); ok('Alice signed in') }
  catch (e) { fail('Alice sign in', e.message); process.exit(1) }
  try { bob = await signIn('bob@example.com', 'test-bob-pw-2025'); ok('Bob signed in') }
  catch (e) { fail('Bob sign in', e.message); process.exit(1) }

  // ── 2. message INSERT ──────────────────────────────────────────────────
  console.log(`\n${Y}[2] INSERT delivery${Z}`)
  const allAliceEvents = []
  let onInsert = null, onUpdate = null

  // ALL handlers registered BEFORE subscribe() — channel reference not needed after subscription
  alice.client
    .channel(`msgs-${Date.now()}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${ROOM_ID}` },
      (p) => {
        allAliceEvents.push(p.eventType)
        info(`Alice event: ${p.eventType} "${p.new?.content?.slice(0, 40) ?? ''}"`)
        if (p.eventType === 'INSERT' && onInsert) onInsert(p.new)
        if (p.eventType === 'UPDATE' && onUpdate) onUpdate(p.new)
      }
    )
    .subscribe(s => info(`Alice msg channel: ${s}`))

  await sleep(3000) // give server time to register postgres_changes subscription

  const testContent = `rt-${Date.now()}`
  info(`Bob inserting: "${testContent}"`)

  let insertedRow = null
  const insertP = new Promise(res => { onInsert = res })
  const { error: ie } = await bob.client.from('messages').insert({ room_id: ROOM_ID, user_id: bob.user.id, content: testContent })
  if (ie) fail('Bob insert', ie.message)
  else ok('Bob inserted to DB')

  try {
    insertedRow = await timeout(insertP, 10000, 'INSERT event')
    onInsert = null
    if (insertedRow.content === testContent) ok(`Alice received INSERT: "${insertedRow.content}"`)
    else fail('INSERT content mismatch', `got "${insertedRow.content}"`)
    if (insertedRow.user_id === bob.user.id) ok('INSERT user_id = Bob')
    else fail('INSERT user_id mismatch')
  } catch (e) {
    fail('Alice missed INSERT event', e.message)
    const { data } = await alice.client.from('messages').select('id,content,user_id').eq('content', testContent).single()
    insertedRow = data
  }

  // ── 3. UPDATE (edit) ───────────────────────────────────────────────────
  console.log(`\n${Y}[3] UPDATE (edit)${Z}`)
  if (!insertedRow?.id) { fail('No row for UPDATE test — skipping') }
  else {
    await sleep(800)
    const editContent = testContent + '-edited'
    const editP = new Promise(res => {
      onUpdate = (row) => { if (row.deleted_at === null) res(row) }
    })
    const { error: ee } = await bob.client.from('messages')
      .update({ content: editContent, edited_at: new Date().toISOString() }).eq('id', insertedRow.id)
    if (ee) fail('Bob edit', ee.message)
    else ok('Bob edited in DB')
    try {
      const row = await timeout(editP, 8000, 'UPDATE event')
      onUpdate = null
      if (row.content === editContent) ok(`Alice received edit: "${row.content}"`)
      else fail('Edit content mismatch', `got "${row.content}"`)
      if (row.edited_at) ok('edited_at is populated')
      else fail('edited_at is null after edit')
    } catch (e) { fail('Alice missed UPDATE event', e.message) }

    // ── 4. soft-delete ─────────────────────────────────────────────────
    console.log(`\n${Y}[4] Soft-delete${Z}`)
    await sleep(600)
    const delP = new Promise(res => {
      onUpdate = (row) => { if (row.deleted_at !== null) res(row) }
    })
    const { error: de } = await bob.client.from('messages')
      .update({ deleted_at: new Date().toISOString() }).eq('id', insertedRow.id)
    if (de) fail('Bob soft-delete', de.message)
    else ok('Bob soft-deleted in DB')
    try {
      const row = await timeout(delP, 8000, 'soft-delete UPDATE event')
      onUpdate = null
      if (row.deleted_at !== null) ok('Alice received soft-delete (deleted_at set)')
      else fail('deleted_at null in soft-delete event')
    } catch (e) { fail('Alice missed soft-delete event', e.message) }
  }

  // ── 5. Presence ────────────────────────────────────────────────────────
  console.log(`\n${Y}[5] Presence — online members${Z}`)

  // Using callback-slot pattern: register .on() BEFORE subscribe(), swap cb later
  let presenceSyncCb = null
  let presenceLeaveCb = null

  const alicePres = alice.client.channel(`room:${ROOM_ID}:presence`, {
    config: { presence: { key: alice.user.id } },
  })
  const bobPres = bob.client.channel(`room:${ROOM_ID}:presence`, {
    config: { presence: { key: bob.user.id } },
  })

  // ALL handlers registered now, before subscribe()
  alicePres
    .on('presence', { event: 'sync' }, () => { if (presenceSyncCb) presenceSyncCb('alice') })
    .on('presence', { event: 'leave' }, ({ leftPresences }) => { if (presenceLeaveCb) presenceLeaveCb(leftPresences) })

  bobPres
    .on('presence', { event: 'sync' }, () => { if (presenceSyncCb) presenceSyncCb('bob') })

  // Now subscribe
  let aliceSubbed = false, bobSubbed = false
  alicePres.subscribe(async s => {
    if (s === 'SUBSCRIBED' && !aliceSubbed) {
      aliceSubbed = true
      await alicePres.track({ userId: alice.user.id, username: 'alice', avatarUrl: null, typing: false, typingUntil: 0 })
      info('Alice tracked')
    }
  })
  bobPres.subscribe(async s => {
    if (s === 'SUBSCRIBED' && !bobSubbed) {
      bobSubbed = true
      await bobPres.track({ userId: bob.user.id, username: 'bob', avatarUrl: null, typing: false, typingUntil: 0 })
      info('Bob tracked')
    }
  })

  // Wait for a sync where Alice can see >= 2 users (herself + Bob)
  const crossSyncP = new Promise(res => {
    presenceSyncCb = (who) => {
      const aliceUsers = Object.values(alicePres.presenceState()).flat()
      const bobUsers = Object.values(bobPres.presenceState()).flat()
      info(`${who} sync: alice sees [${aliceUsers.map(u => u.username).join(', ')}], bob sees [${bobUsers.map(u => u.username).join(', ')}]`)
      if (aliceUsers.length >= 2 && bobUsers.length >= 2) res({ aliceUsers, bobUsers })
    }
  })

  try {
    const { aliceUsers, bobUsers } = await timeout(crossSyncP, 12000, 'cross-client presence sync')
    presenceSyncCb = null
    ok('Both clients see >= 2 users in presence')
    if (aliceUsers.some(u => u.userId === alice.user.id)) ok('Alice sees herself')
    else fail('Alice missing herself')
    if (aliceUsers.some(u => u.userId === bob.user.id)) ok('Alice sees Bob')
    else fail('Alice missing Bob')
    if (bobUsers.some(u => u.userId === alice.user.id)) ok('Bob sees Alice')
    else fail('Bob missing Alice')
    if (bobUsers.some(u => u.userId === bob.user.id)) ok('Bob sees himself')
    else fail('Bob missing himself')
  } catch (e) {
    fail('Cross-client presence sync timed out', e.message)
    // Log current state for debugging
    const a = Object.values(alicePres.presenceState()).flat()
    const b = Object.values(bobPres.presenceState()).flat()
    info(`Alice current: [${a.map(u => u.username).join(', ')}]`)
    info(`Bob current: [${b.map(u => u.username).join(', ')}]`)
    presenceSyncCb = null
  }

  // ── 6. Typing indicator ───────────────────────────────────────────────
  console.log(`\n${Y}[6] Typing indicator${Z}`)

  // Bob starts typing — Alice should see typing=true in next sync
  const typingP = new Promise(res => {
    presenceSyncCb = () => {
      const users = Object.values(alicePres.presenceState()).flat()
      const typing = users.find(u => u.userId === bob.user.id && u.typing === true)
      if (typing) res(typing)
    }
  })

  await bobPres.track({ userId: bob.user.id, username: 'bob', avatarUrl: null, typing: true, typingUntil: Date.now() + 3000 })
  info('Bob set typing: true')

  try {
    await timeout(typingP, 6000, 'Alice sees Bob typing')
    presenceSyncCb = null
    ok('Alice sees Bob typing: true')
  } catch (e) { fail('Alice missed Bob typing', e.message) }

  // Bob stops typing
  const stopP = new Promise(res => {
    presenceSyncCb = () => {
      const users = Object.values(alicePres.presenceState()).flat()
      const b = users.find(u => u.userId === bob.user.id)
      if (b && b.typing === false) res(b)
    }
  })

  await bobPres.track({ userId: bob.user.id, username: 'bob', avatarUrl: null, typing: false, typingUntil: 0 })
  info('Bob set typing: false')

  try {
    await timeout(stopP, 6000, 'Alice sees Bob stop typing')
    presenceSyncCb = null
    ok('Alice sees Bob typing: false')
  } catch (e) { fail('Alice missed Bob stop-typing', e.message) }

  // ── 7. Presence leave ────────────────────────────────────────────────
  console.log(`\n${Y}[7] Presence leave${Z}`)

  const leaveP = new Promise(res => {
    presenceLeaveCb = (leftPresences) => {
      if (leftPresences.some(u => u.userId === bob.user.id)) res(true)
    }
  })

  await bob.client.removeChannel(bobPres)
  info('Bob unsubscribed from presence')

  try {
    await timeout(leaveP, 8000, 'Alice sees Bob leave')
    presenceLeaveCb = null
    ok('Alice received Bob leave event')
  } catch (e) { fail('Alice missed Bob leave', e.message) }

  // ── Summary ──────────────────────────────────────────────────────────
  const divider = '─'.repeat(50)
  console.log(`\n${divider}`)
  info(`postgres_changes events seen by Alice: [${[...new Set(allAliceEvents)].join(', ')}]`)
  console.log(`${G}Passed: ${passed}${Z}   ${failed > 0 ? R : G}Failed: ${failed}${Z}`)
  console.log(divider + '\n')

  await alice.client.removeAllChannels()
  await bob.client.removeAllChannels()

  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error(R + 'Fatal: ' + e.message + Z); process.exit(1) })
