import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { verifyHistoricalChapter } from './audit-story-coverage.mjs'

const original = JSON.parse(await readFile(new URL('../docs/qa/c11-normal-star-rescue.json', import.meta.url), 'utf8'))
const chapter = { id: 22 }
const events = [{ id: 'soul-prison-teacher-extraction', stages: Array(6).fill('stage') }]

test('coverage accepts the archived rescue clear without treating optional pages as completed', () => {
  const result = verifyHistoricalChapter(chapter, [...events,
    { id: 'doctor-rescue-reunion', optional: true, stages: Array(4) }], original)
  assert.equal(result.checkpoint, '22')
})

test('coverage rejects pending report as a completed chapter', () => {
  const proof = structuredClone(original)
  proof.records = [{ ...proof.records.find(row => row.key === '22-pending'), key: '22' }]
  assert.throws(() => verifyHistoricalChapter(chapter, events, proof), /completed ledger/)
})

test('coverage rejects a published clear whose required event is still incomplete', () => {
  const proof = structuredClone(original)
  proof.records.find(row => row.key === '22').progress.events[events[0].id].stage--
  assert.throws(() => verifyHistoricalChapter(chapter, events, proof), /no matching completed historical checkpoint/)
})

test('a new required story event needs independent evidence and cannot inherit the old clear', () => {
  assert.throws(() => verifyHistoricalChapter(chapter, [...events,
    { id: 'future-rebirth', stages: Array(8) }], original), /future-rebirth not started/)
})

test('coverage rejects missing native digest and an unread opening', () => {
  const proof = structuredClone(original)
  const clear = proof.records.find(row => row.key === '22')
  clear.fileSha256 = ''
  assert.throws(() => verifyHistoricalChapter(chapter, events, proof))
  clear.progress.intro = false
  assert.throws(() => verifyHistoricalChapter(chapter, events, proof), /opening not read/)
})

test('coverage rejects a missing historical clear and a challenge without a result', () => {
  const proof = structuredClone(original)
  proof.records.find(row => row.key === '22').progress.boss = false
  assert.throws(() => verifyHistoricalChapter(chapter, events, proof), /challenge not completed/)
  proof.records = []
  assert.throws(() => verifyHistoricalChapter(chapter, events, proof), /missing historical first-clear/)
})
