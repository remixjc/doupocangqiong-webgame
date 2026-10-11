import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import AdventureScene from '../game/AdventureScene'
import { HEIGHT, WIDTH } from '../game/combat'
import { mountDeferred } from '../game/lifecycle'

export default function GameView() {
  const container = useRef<HTMLDivElement>(null)
  const [failure, setFailure] = useState<Error | null>(null)
  useEffect(() => {
    // StrictMode checks mount/cleanup synchronously. Avoid booting a discarded
    // Phaser instance whose asynchronous destroy would overlap the real one.
    return mountDeferred(() => {
      if (!container.current) throw new Error('Scene container is unavailable')
      return new Phaser.Game({
        type: Phaser.AUTO, parent: container.current, width: WIDTH, height: HEIGHT,
        backgroundColor: '#213b33', scene: [new AdventureScene(error => setFailure(error instanceof Error ? error : new Error('Scene execution failed')))],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, pixelArt: false }, audio: { noAudio: true },
        input: { keyboard: { capture: [] } },
      })
    }, game => game.destroy(true), error => setFailure(error instanceof Error ? error : new Error('Scene initialization failed')))
  }, [])
  if (failure) throw failure
  return <div className="game-canvas" ref={container} tabIndex={0} aria-describedby="scene-keyboard-help" aria-label="探索场景：WASD移动，J普攻，空格闪避，E交互" role="application" />
}
