import { stagedFieldsMatch } from './state-guards'
export const FIRST_ROAD_MEETING_VERSION = '0.63.0'
export interface FirstRoadMeetingState {
  stage: number
  turned: boolean
  laughter: boolean
  group: boolean
  identified: boolean
  remembered: boolean
  passed: boolean
  called: boolean
  replied: boolean
  nothing: boolean
  resumed: boolean
  parted: boolean
}
export function firstRoadMeetingAt(stage: number): FirstRoadMeetingState {
  return { stage, turned: stage >= 1, laughter: stage >= 2, group: stage >= 3,
    identified: stage >= 4, remembered: stage >= 5, passed: stage >= 6,
    called: stage >= 7, replied: stage >= 8, nothing: stage >= 9,
    resumed: stage >= 10, parted: stage >= 11 }
}
export function validFirstRoadMeeting(task: Record<string, unknown> | FirstRoadMeetingState): task is FirstRoadMeetingState {
  return stagedFieldsMatch(task, 12, firstRoadMeetingAt)
}
