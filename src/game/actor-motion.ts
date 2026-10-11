export interface ActorSample {
  x: number; y: number; hp?: number; facing?: number; hit?: number; roll?: number; windup?: number
  target?: { x: number; y: number }
}
export interface ActorPose {
  mode: 'idle' | 'move' | 'attack' | 'skill' | 'dodge' | 'hurt' | 'windup' | 'dead'
  bob: number; stride: number; leanX: number; leanY: number
  squash: number; reach: number; sweep: number; side: number
}
const idle: ActorPose = {
  mode: 'idle', bob: 0, stride: 0, leanX: 0, leanY: 0, squash: 1, reach: 0, sweep: 0, side: 1,
}
export const idlePose = () => ({ ...idle })
interface Track { x: number; y: number; time: number; phase: number; moving: boolean; facing: number }

/** Samples simulation time and positions only; never mutates combat or runs a second clock. */
export class ActorMotion {
  private tracks = new WeakMap<ActorSample, Track>()
  private action?: { kind: 'attack' | 'skill'; time: number }
  cue(kind: 'attack' | 'skill', time: number) { this.action = { kind, time } }
  pose(actor: ActorSample, time: number, reduced: boolean, player = false): ActorPose {
    let track = this.tracks.get(actor)
    if (!track || time < track.time) {
      track = { x: actor.x, y: actor.y, time, phase: 0, moving: false, facing: actor.facing ?? 0 }
      this.tracks.set(actor, track)
    } else if (time > track.time) {
      const distance = Math.hypot(actor.x - track.x, actor.y - track.y)
      // Scene transfers are teleports, not a huge running stride.
      track.moving = distance > .01 && distance < 60
      if (track.moving) track.facing = Math.atan2(actor.y - track.y, actor.x - track.x)
      track.phase = track.moving ? (track.phase + distance / 16) % (Math.PI * 2) : 0
      track.x = actor.x; track.y = actor.y; track.time = time
    }
    const age = this.action ? time - this.action.time : -1
    const action = player && age >= 0 && age < .28 ? this.action!.kind : undefined
    const mode: ActorPose['mode'] = actor.hp !== undefined && actor.hp <= 0 ? 'dead'
      : (actor.hit ?? 0) > 0 ? 'hurt' : (actor.roll ?? 0) > 0 ? 'dodge'
      : action ?? ((actor.windup ?? 0) > 0 ? 'windup' : track.moving ? 'move' : 'idle')
    const facing = actor.facing ?? (mode === 'windup' && actor.target
      ? Math.atan2(actor.target.y - actor.y, actor.target.x - actor.x) : track.facing)
    const side = Math.cos(facing) < 0 ? -1 : 1
    const pose: ActorPose = { ...idle, mode, side }
    if (mode === 'attack' || mode === 'skill') {
      const strength = reduced ? 1 : Math.sin(Math.PI * age / .28)
      pose.reach = strength * (mode === 'skill' ? 16 : 12)
      pose.sweep = reduced ? 0 : (age / .28 - .5) * 1.4
      if (!reduced) { pose.leanX = Math.cos(facing) * strength * 5; pose.leanY = Math.sin(facing) * strength * 3 }
    } else if (mode === 'windup') {
      pose.reach = -6
      if (!reduced) pose.leanX = -side * 3
    }
    if (!reduced) {
      if (mode === 'move') {
        pose.stride = Math.sin(track.phase) * 6
        pose.bob = -Math.abs(Math.sin(track.phase)) * 2
        pose.leanX = side * 2
      } else if (mode === 'dodge') {
        pose.squash = .65; pose.leanX = Math.cos(facing) * 8; pose.leanY = Math.sin(facing) * 4
      } else if (mode === 'hurt') {
        pose.leanX = -Math.cos(facing) * 5; pose.leanY = -Math.sin(facing) * 3
      }
    }
    return pose
  }
}
