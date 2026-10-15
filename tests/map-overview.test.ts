import { describe, expect, it } from 'vitest'
import { mapForChapter } from '../src/content/maps'
import { mapOverviewForChapter, mapOverviews } from '../src/content/map-overview'
import { initialState } from '../src/core/model'
import { GameStore } from '../src/core/store'

describe('startup map overview matches deferred full geometry', () => {
  it('matches every displayed field and runtime spawn, including legacy fallback', () => {
    expect(Object.keys(mapOverviews).map(Number)).toEqual(Array.from({ length: 29 }, (_, i) => i))
    for (let id = -1; id <= 30; id++) {
      const map = mapForChapter(id), overview = mapOverviewForChapter(id)
      expect(overview).toEqual({
        spawn: map.spawn, gateLabel: map.gateLabel, trialMode: map.trialMode,
        thunderRoute: !!map.thunderRoute, escapeRoute: !!map.escapeRoute,
        heatZone: !!map.heatZone, duelArena: !!map.duelArena,
      })
      const state = initialState(); state.chapter = id
      const store = new GameStore({ load: async () => state, write: async () => {} })
      store.replace(state)
      expect(store.getSnapshot().runtime).toMatchObject(map.spawn)
    }
  })
})
