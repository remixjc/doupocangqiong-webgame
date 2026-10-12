import { HallText } from './MapPrimitives'

export function HallBackground({ height = 115 }: { height?: number }) {
  return <rect x="100" y="190" width="390" height={height} fill="#293e36" />
}
export function HallWestField() {
  return <><rect x="160" y="220" width="110" height="45" fill="none" stroke="#bfa46a" />
    <HallText x="215" y="211">西侧训练场</HallText></>
}
export function HallEastShelf() {
  return <><rect x="345" y="210" width="110" height="20" fill="#937954" />
    <HallText x="400" y="201">东侧书架</HallText></>
}
export function XunerReadingScroll() {
  return <rect aria-label="薰儿自己的临时阅读卷" x="360" y="257" width="13" height="9" fill="#604572" stroke="#c2a679" />
}
