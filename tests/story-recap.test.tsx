import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { chapterById } from '../src/content/chapters'
import { blankProgress, initialState } from '../src/core/model'
import { chapterRecaps } from '../src/core/story-recap'
import StoryRecap from '../src/ui/StoryRecap'

describe('篇章回顾访问规则', () => {
  it('未读开场没有对白，读完后仅可见开场，击败首领也不提前展示收尾', () => {
    const state = initialState()
    expect(chapterRecaps(state)).toEqual([])
    expect(renderToStaticMarkup(<StoryRecap state={state} />)).toContain('还没有可回顾的篇章')
    state.progress[1].intro = true
    state.progress[1].boss = true
    const [recap] = chapterRecaps(state)
    expect(recap.opening).toEqual(chapterById(1).opening)
    expect(recap.closing).toEqual([])
    const html = renderToStaticMarkup(<StoryRecap state={state} />)
    expect(html).toContain('完成本章首通结算后')
    for (const line of chapterById(1).closing) expect(html).not.toContain(line.text)
  })
  it('已首通旧档可读修订的开场与收尾，不需要补写intro或重新进入', () => {
    const state = initialState()
    state.completed = [1, 2]
    state.chapter = 2
    state.progress[2] = blankProgress(2)
    const before = JSON.stringify(state)
    const recaps = chapterRecaps(state)
    expect(recaps.map(chapter => chapter.id)).toEqual([1, 2])
    expect(recaps[1].closing).toEqual(chapterById(2).closing)
    const html = renderToStaticMarkup(<StoryRecap state={state} />)
    for (const line of [...chapterById(2).opening, ...chapterById(2).closing]) expect(html).toContain(line.text)
    expect(JSON.stringify(state)).toBe(before)
    expect(state.progress[2].intro).toBe(false)
  })
  it('进度与动画范围均过滤，不露出未读下一章或范围外旧档收尾', () => {
    const state = initialState()
    state.completed = Array.from({ length: 28 }, (_, index) => index + 1)
    state.chapter = 28
    state.settings.spoiler = 'anime'
    state.settings.animeLimit = 2
    const recaps = chapterRecaps(state)
    expect(recaps.map(chapter => chapter.id)).toEqual([1, 2])
    const html = renderToStaticMarkup(<StoryRecap state={state} />)
    expect(html).not.toContain(chapterById(28).title)
    for (const line of chapterById(28).closing) expect(html).not.toContain(line.text)
    state.settings.spoiler = 'novel'
    expect(chapterRecaps(state)).toHaveLength(28)
  })
  it('非法未来intro不绕过解锁；回顾不改变金币材料、任务或主线状态', () => {
    const state = initialState()
    state.progress[1].intro = true
    state.progress[20] = { ...blankProgress(20), intro: true, boss: true }
    const before = structuredClone(state)
    expect(chapterRecaps(state).map(chapter => chapter.id)).toEqual([1])
    for (let index = 0; index < 20; index++) renderToStaticMarkup(<StoryRecap state={state} />)
    expect(state).toEqual(before)
  })
})
