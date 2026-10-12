import type { ChapterEvent, Reflection } from './events'
import type { BondChoice, BondDefinition } from './bonds'
import type { MapDefinition, MapEnemy, Point, TowerFloor } from './maps'

// Tuple positions are checked against the exact original property order.
// Separate schemas preserve omitted properties (including guards and rewards).
function record<T>() {
  return <const Keys extends readonly (keyof T)[]>(keys: Keys) =>
    (values: { [I in keyof Keys]: T[Keys[I]] }): Pick<T, Keys[number]> =>
      Object.fromEntries(keys.map((key, i) => [key, values[i]])) as Pick<T, Keys[number]>
}
type Checkpoint = NonNullable<ChapterEvent['checkpoints']>[number]
export const checkpoint = record<Checkpoint>()(['x', 'y', 'label', 'text'])
export const guardedCheckpoint = record<Checkpoint>()(['x', 'y', 'label', 'text', 'guards'])
export const guardFirstCheckpoint = record<Checkpoint>()(['x', 'y', 'label', 'guards', 'text'])
export const chapterEvent = record<ChapterEvent>()(['id', 'kind', 'introducedVersion', 'title', 'speaker', 'npc', 'stages', 'introduction', 'note', 'checkpoints'])
export const dependentChapterEvent = record<ChapterEvent>()(['id', 'kind', 'introducedVersion', 'requires', 'title', 'speaker', 'npc', 'stages', 'introduction', 'note', 'checkpoints'])
export const reflectionOption = record<Reflection['options'][number]>()(['choice', 'label', 'response'])
export const reflection = record<Reflection>()(['clue', 'answer', 'options'])
export const landmark = record<Point & { label: string }>()(['x', 'y', 'label'])
export const namedEnemy = record<MapEnemy>()(['id', 'type', 'x', 'y'])
export const enemy = record<MapEnemy>()(['type', 'x', 'y'])
export const eventBarrier = record<NonNullable<MapDefinition['eventBarrier']>>()(['eventId', 'unlockedStage', 'obstacle'])
export const purificationZone = record<NonNullable<MapDefinition['purificationZones']>[number]>()(['center', 'radius', 'duration'])
export const towerFloor = record<TowerFloor>()(['center', 'cooling', 'duration', 'pressure', 'radius'])
export const bondChoice = record<BondChoice>()(['choice', 'label', 'response', 'reward'])
export const bondDefinition = record<BondDefinition>()(['lineId', 'question', 'options'])
export const healingReward = record<BondChoice['reward']>()(['xp', 'heal'])
export const manaReward = record<BondChoice['reward']>()(['xp', 'mana'])
export const chapterHistory = record<NonNullable<ChapterEvent['requiresHistory']>[number]>()(['chapter', 'eventId'])
export const completedHistoryBond = record<ChapterEvent>()(['id', 'kind', 'optional', 'introducedVersion', 'requiresCompleted', 'requiresHistory', 'title', 'speaker', 'npc', 'stages', 'introduction', 'note', 'checkpoints', 'bond'])
export const completedBond = record<ChapterEvent>()(['id', 'kind', 'optional', 'introducedVersion', 'requiresCompleted', 'title', 'speaker', 'npc', 'stages', 'introduction', 'note', 'checkpoints', 'bond'])
export const dependentHistoryBond = record<ChapterEvent>()(['id', 'kind', 'optional', 'introducedVersion', 'requires', 'requiresHistory', 'title', 'speaker', 'npc', 'stages', 'introduction', 'note', 'checkpoints', 'bond'])
