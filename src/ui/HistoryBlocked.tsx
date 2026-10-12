export default function HistoryBlocked({ message, onBack, muted = false }: { message: string; onBack: () => void; muted?: boolean }) {
  return <><p className={muted ? 'muted' : undefined}>{message}</p><button className="secondary" onClick={onBack}>返回往事手札</button></>
}
