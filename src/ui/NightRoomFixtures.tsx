import { MapText } from './MapPrimitives'
export default function NightRoomFixtures({ door, tea }: { door: string; tea: boolean }) {
  return <><path d="M160 120 H420 V300 H160Z" fill="#3b3931" stroke="#bfa46a" />
    <rect x="195" y="294" width="50" height="12" fill={door === 'closed' ? '#856644' : '#111e27'} aria-label={`本人房门${door}`} />
    <rect x="315" y="245" width="65" height="40" fill="#856644" /><MapText x="355" y="233">身旁桌</MapText>
    <circle cx="360" cy="268" r="7" fill="#bfa46a" aria-label={tea ? '茶已饮' : '桌边茶'} />
    <MapText x="220" y="335">薰儿已在院中分路</MapText></>
}
