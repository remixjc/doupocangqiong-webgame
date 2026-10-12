import { Suspense, type ReactNode } from 'react'
export default function DeferredScene({ message, children }: { message: string; children: ReactNode }) {
  return <Suspense fallback={<p role="status">{message}</p>}>{children}</Suspense>
}
