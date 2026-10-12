import { StatusParagraph } from './NativeRegions'
import { Suspense, type ReactNode } from 'react'
export default function DeferredScene({ message, children }: { message: string; children: ReactNode }) {
  return <Suspense fallback={<StatusParagraph>{message}</StatusParagraph>}>{children}</Suspense>
}
