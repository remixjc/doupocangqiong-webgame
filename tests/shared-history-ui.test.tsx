import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SceneHeading from '../src/ui/SceneHeading'
import HistoryBlocked from '../src/ui/HistoryBlocked'

describe('history UI factoring keeps text, escaping and DOM boundaries', () => {
  it('retains heading, optional speaker and both near/far text including escaped imports', () => {
    for (const speaker of [undefined, '', '老师 <script>'])
      for (const text of ['当时记录', '先走近青石。', '原件 <img onerror=bad> &'])
        expect(renderToStaticMarkup(<SceneHeading title="记录 & <" speaker={speaker} text={text} />))
          .toBe(renderToStaticMarkup(<><h3>记录 &amp; &lt;</h3>{speaker !== undefined && <b>{speaker}</b>}<p>{text}</p></>))
  })
  it('keeps blocked paragraph style and accessible return control without adding a wrapper', () => {
    for (const muted of [false, true])
      expect(renderToStaticMarkup(<HistoryBlocked message="当前范围封存 <" muted={muted} onBack={() => {}} />))
        .toBe(renderToStaticMarkup(<><p className={muted ? 'muted' : undefined}>当前范围封存 &lt;</p><button className="secondary">返回往事手札</button></>))
  })
})
