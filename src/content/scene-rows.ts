type SceneValue = string | number | boolean
type SceneRow<Keys extends readonly string[], Row extends readonly SceneValue[]> = {
  readonly [I in Extract<keyof Keys, `${number}`> as Keys[I] extends string ? Keys[I] : never]: I extends keyof Row ? Row[I] : never
}
type SceneRows<Keys extends readonly string[], Rows extends readonly (readonly SceneValue[])[]> = {
  [I in keyof Rows]: SceneRow<Keys, Rows[I]>
}

// Keep scene literals and their unions while storing repeated field names only once.
export function defineSceneRows<const Keys extends readonly string[], const Rows extends readonly { readonly [I in keyof Keys]: SceneValue }[]>(
  keys: Keys, rows: Rows,
): SceneRows<Keys, Rows> {
  return rows.map(row => Object.fromEntries(keys.map((key, i) => [key, row[i]]))) as SceneRows<Keys, Rows>
}
