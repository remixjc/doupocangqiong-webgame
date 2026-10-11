import type Phaser from 'phaser'
import { idlePose, type ActorPose } from './actor-motion'

/** Code-native figure. Shadow stays on the simulation anchor; limbs are presentation only. */
export function drawActor(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, scale: number, player: boolean, pose: ActorPose = idlePose()) {
  g.fillStyle(0x061515, .35); g.fillEllipse(x + 2, y + 13 * scale, 35 * scale, 14 * scale)
  const bodyX = x + pose.leanX * scale, bodyY = y + (pose.bob + pose.leanY) * scale
  const vertical = scale * pose.squash
  // Alternating feet and sleeves make travel readable at the existing map scale.
  g.lineStyle(4 * scale, 0x172426)
  g.lineBetween(x - 5 * scale, y + 6 * scale, x - 5 * scale, y + (16 + pose.stride) * scale)
  g.lineBetween(x + 5 * scale, y + 6 * scale, x + 5 * scale, y + (16 - pose.stride) * scale)
  g.fillStyle(color)
  g.fillTriangle(bodyX - 16 * scale, bodyY + 12 * vertical, bodyX, bodyY - 23 * vertical, bodyX + 16 * scale, bodyY + 12 * vertical)
  g.fillRoundedRect(bodyX - 9 * scale, bodyY - 21 * vertical, 18 * scale, 25 * vertical, 4)
  g.lineStyle(5 * scale, color)
  g.lineBetween(bodyX - 8 * scale, bodyY - 17 * vertical, bodyX - (15 - pose.stride / 2) * scale, bodyY - 4 * vertical)
  g.lineBetween(bodyX + 8 * pose.side * scale, bodyY - 17 * vertical, bodyX + (15 + pose.reach) * pose.side * scale, bodyY - (5 + pose.reach / 2) * vertical)
  g.fillStyle(player ? 0xe3c5a0 : 0xc2ac8c); g.fillCircle(bodyX, bodyY - 28 * vertical, 8 * scale)
  g.fillStyle(0x172426); g.fillEllipse(bodyX, bodyY - 34 * vertical, 18 * scale, 9 * scale)
  g.lineStyle(2 * scale, player ? 0xc4a67d : 0x453f38); g.lineBetween(bodyX - 9 * scale, bodyY - vertical, bodyX + 9 * scale, bodyY - vertical)
  if (player) {
    g.lineStyle(2, 0x314747); g.lineBetween(bodyX - 3 * scale, bodyY - 37 * vertical, bodyX - 16 * scale, bodyY - 28 * vertical)
    g.fillStyle(0x142324); g.fillRoundedRect(bodyX - 18 * scale, bodyY - 22 * vertical, 7 * scale, 32 * vertical, 2)
  }
  if (pose.mode === 'skill' || pose.mode === 'dodge' || pose.mode === 'hurt') {
    const cue = pose.mode === 'skill' ? 0xefc68f : pose.mode === 'dodge' ? 0x9bd7cb : 0xe3937f
    g.lineStyle(2, cue, .7)
    if (pose.mode === 'hurt') {
      g.lineBetween(x - 24 * scale, y - 18 * scale, x - 19 * scale, y - 13 * scale)
      g.lineBetween(x + 19 * scale, y - 13 * scale, x + 24 * scale, y - 18 * scale)
    } else g.strokeEllipse(x, y + 12 * scale, 44 * scale, 18 * scale)
  }
}
