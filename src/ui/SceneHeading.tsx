import type { ReactNode } from 'react'

export default function SceneHeading({ title, text, speaker }: { title: string; text: ReactNode; speaker?: string }) {
  return <><h3>{title}</h3>{speaker !== undefined && <b>{speaker}</b>}<p>{text}</p></>
}
