import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import AdventureScene from '../game/AdventureScene'
import { HEIGHT, WIDTH } from '../game/combat'

export default function GameView() {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO, parent: container.current!, width: WIDTH, height: HEIGHT,
      backgroundColor: '#213b33', scene: [AdventureScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, pixelArt: false }, audio: { noAudio: true },
      input: { keyboard: { capture: [32, 37, 38, 39, 40] } },
    })
    return () => { game.destroy(true) }
  }, [])
  return <div className="game-canvas" ref={container} aria-label="探索场景：WASD移动，J普攻，空格闪避，E交互" role="application" />
}
