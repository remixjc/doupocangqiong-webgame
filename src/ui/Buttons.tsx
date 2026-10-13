import type { ComponentProps } from 'react'

// Keep native button props (including React 19 refs), focus, and event handling.
export function SecondaryButton(props: ComponentProps<'button'>) {
  return <button className="secondary" {...props} />
}
export function PrimaryButton(props: ComponentProps<'button'>) {
  return <button className="primary" {...props} />
}

// Keep the original SecondaryButton boundary and its native keyboard behavior.
export function actorButton<A extends string>(current: A, select: (value: A) => void, value: A, label: ComponentProps<'button'>['children'], key?: string) {
  return <SecondaryButton key={key} aria-pressed={current === value} onClick={() => select(value)}>{label}</SecondaryButton>
}

export function sceneButton<O extends string>(scene: { operation: O; action: ComponentProps<'button'>['children'] }, disabled: boolean | undefined, act: (operation: O) => void) {
  const onClick = () => act(scene.operation)
  return disabled === undefined ? <PrimaryButton onClick={onClick}>{scene.action}</PrimaryButton>
    : <PrimaryButton disabled={disabled} onClick={onClick}>{scene.action}</PrimaryButton>
}

// Keep the same component boundary and exact callback; focus belongs to the caller.
export function returnButton(onBack: () => void, children: ComponentProps<'button'>['children']) {
  return <SecondaryButton onClick={onBack}>{children}</SecondaryButton>
}
