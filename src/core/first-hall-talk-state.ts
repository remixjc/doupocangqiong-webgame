import { stagedFieldsMatch } from './state-guards'

export const FIRST_HALL_TALK_VERSION = '0.68.0'
export interface FirstHallTalkState {
  stage: number
  greeted: boolean
  seated: boolean
  ownScroll: 'shelf' | 'xuner'
  fourthConfirmed: boolean
  timePromised: boolean
}
export function firstHallTalkAt(stage: number): FirstHallTalkState {
  return { stage, greeted: stage >= 1, seated: stage >= 4,
    ownScroll: stage >= 5 ? 'xuner' : 'shelf', fourthConfirmed: stage >= 9, timePromised: stage >= 17 }
}
export function validFirstHallTalk(t: Record<string, unknown> | FirstHallTalkState): t is FirstHallTalkState {
  return stagedFieldsMatch(t, 20, firstHallTalkAt)
}
export function hallTalkMinimum(stage: number): number {
  return stage >= 9 ? 5 : 4
}
