// Services, bookings and the academy against a fake fetch: paths, the student
// header, refusals as DakioError, and the browser-only guard on writes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDakio, DakioError } from '../src/index.ts'

const LIVE = 'dk_pub_live_' + 'A'.repeat(24)
type Call = { url: string; method: string; headers: Record<string, string>; body: unknown }

function client(answers: Array<{ status: number; body?: unknown }>, extra: Record<string, unknown> = {}) {
  const calls: Call[] = []
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method || 'GET', headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const a = answers.length > 1 ? answers.shift()! : answers[0]
    return new Response(JSON.stringify(a.body ?? null), { status: a.status, headers: { 'Content-Type': 'application/json' } })
  }) as unknown as typeof globalThis.fetch
  return { dakio: createDakio({ key: LIVE, baseUrl: 'https://api.test/v1', fetch, serverCheckout: 'allow', ...extra }), calls }
}

test('services and slots are reads; a booking is a POST; a missing booking is null', async () => {
  const { dakio, calls } = client([
    { status: 200, body: { data: { services: [{ id: 's1', name: 'Discovery call' }], booking: { open: true, autoConfirm: true } } } },
    { status: 200, body: { data: { asked: '2026-11-02', askedFree: true, days: [{ date: '2026-11-02', day: 'Mon', times: ['10:00'] }] } } },
    { status: 200, body: { data: { token: 'tok', status: 'confirmed', date: '2026-11-02', time: '10:00', when: 'Mon 2 Nov, 10:00 am' } } },
    { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Booking not found.' } } },
  ])
  assert.equal((await dakio.services.list()).booking.open, true)
  const slots = await dakio.bookings.slots({ service: 'discovery-call', date: '2026-11-02' })
  assert.equal(slots.days[0].times[0], '10:00')
  assert.equal(calls[1].url, 'https://api.test/v1/bookings/slots?service=discovery-call&date=2026-11-02')
  const b = await dakio.bookings.create({ service: 'discovery-call', date: '2026-11-02', time: '10:00', name: 'Nadia', phone: '01811000222' })
  assert.equal(b.token, 'tok')
  assert.equal(calls[2].method, 'POST')
  assert.equal(await dakio.bookings.get('gone'), null)
})

test('a taken slot throws SLOT_TAKEN', async () => {
  const { dakio } = client([{ status: 409, body: { error: { code: 'SLOT_TAKEN', message: 'That time was just taken.' } } }])
  await assert.rejects(dakio.bookings.create({ service: 's', date: '2026-11-02', time: '10:00', name: 'N', phone: '01811000222' }), (e: DakioError) => e.code === 'SLOT_TAKEN' && e.status === 409)
})

test('academy: catalogue reads, sign-in, and the student token rides in Dakio-Student', async () => {
  const { dakio, calls } = client([
    { status: 200, body: { data: [{ id: 'p1', slug: 'career-clarity' }] } },
    { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Program not found.' } } },
    { status: 200, body: { data: { sessionToken: 'st', expiresAt: 'x', devCode: '000000' } } },
    { status: 200, body: { data: { token: 'dks_abc', expiresAt: 'x', student: { name: 'Nadia', phone: '01811000222', email: null } } } },
    { status: 200, body: { data: { student: { name: 'Nadia' }, enrollments: [] } } },
    { status: 200, body: { data: { lessonId: 'l1', positionSec: 30, watchedSec: 30, completed: false, completedAt: null } } },
    { status: 200, body: { data: { status: 'active', access: 'free', already: false, enrollmentId: 'e1', payment: null, pay: null, signInToWatch: false } } },
  ])
  assert.equal((await dakio.academy.programs.list())[0].slug, 'career-clarity')
  assert.equal(await dakio.academy.programs.get('nope'), null)
  const code = await dakio.academy.login.sendCode('01811000222')
  const s = await dakio.academy.login.verify({ sessionToken: code.sessionToken, otp: code.devCode! })
  await dakio.academy.me(s.token)
  assert.equal(calls[4].url, 'https://api.test/v1/academy/me')
  assert.equal(calls[4].headers['Dakio-Student'], 'dks_abc')
  await dakio.academy.progress(s.token, { lessonId: 'l1', positionSec: 30, watchedSec: 30 })
  assert.deepEqual(calls[5].body, { lessonId: 'l1', positionSec: 30, watchedSec: 30 })
  await dakio.academy.enroll({ program: 'free-starter' }, { student: s.token })
  assert.equal(calls[6].headers['Dakio-Student'], 'dks_abc')
  assert.equal(calls[0].headers['Dakio-Student'], undefined)
})

test('not enrolled yet: NOT_ENROLLED (403); signed out: STUDENT_SIGNED_OUT (401)', async () => {
  const { dakio } = client([
    { status: 403, body: { error: { code: 'NOT_ENROLLED', message: 'Your place is waiting to be confirmed.' } } },
    { status: 401, body: { error: { code: 'STUDENT_SIGNED_OUT', message: 'Sign in.' } } },
  ])
  await assert.rejects(dakio.academy.program('dks_x', 'career-clarity'), (e: DakioError) => e.code === 'NOT_ENROLLED' && e.status === 403)
  await assert.rejects(dakio.academy.me('dks_x'), (e: DakioError) => e.code === 'STUDENT_SIGNED_OUT' && e.status === 401)
})

test('booking, enrolling and signing in run in the browser with a client key', async () => {
  const { dakio } = client([{ status: 200, body: { data: {} } }], { serverCheckout: 'refuse' })
  await assert.rejects(dakio.bookings.create({ service: 's', date: 'd', time: 't', name: 'n', phone: 'p' }), (e: DakioError) => e.code === 'CHECKOUT_MUST_RUN_IN_BROWSER')
  await assert.rejects(dakio.academy.enroll({ program: 'p' }), (e: DakioError) => e.code === 'CHECKOUT_MUST_RUN_IN_BROWSER')
  await assert.rejects(dakio.academy.login.sendCode('01811000222'), (e: DakioError) => e.code === 'CHECKOUT_MUST_RUN_IN_BROWSER')
  // reads work anywhere
  await dakio.academy.programs.list()
})
