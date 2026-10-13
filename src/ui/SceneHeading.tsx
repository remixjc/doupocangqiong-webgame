import type { ReactNode } from 'react'

// Return the same component and props without adding a component boundary.
export function sceneHeading(scene: { title: string; text: ReactNode }, text: ReactNode = scene.text) {
  return <SceneHeading title={scene.title} text={text} />
}
export function spokenSceneHeading(scene: { title: string; text: ReactNode; speaker: string }) {
  return <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
}

export default function SceneHeading({ title, text, speaker }: { title: string; text: ReactNode; speaker?: string }) {
  return <><h3>{title}</h3>{speaker !== undefined && <b>{speaker}</b>}<p>{text}</p></>
}
