// Only fields needed before the deferred gameplay scene loads.
// Full geometry remains in maps.ts; parity is checked in tests/map-overview.test.ts.
import type { Point } from './map-point'
export interface MapOverview { spawn: Point; gateLabel?: string; trialMode?: 'assessment' | 'attunement'; thunderRoute: boolean; escapeRoute: boolean; heatZone: boolean; duelArena: boolean }
export const mapOverviews: Record<number, MapOverview> = {
  "0": {
    "spawn": {
      "x": 210,
      "y": 615
    },
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "1": {
    "spawn": {
      "x": 210,
      "y": 615
    },
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "2": {
    "spawn": {
      "x": 210,
      "y": 635
    },
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "3": {
    "spawn": {
      "x": 185,
      "y": 620
    },
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "4": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "5": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "6": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "审核台",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "7": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "8": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "收服台",
    "trialMode": "attunement",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": true,
    "duelArena": false
  },
  "9": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "领奖台",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "10": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "决斗碑",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": true
  },
  "11": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "山路出口",
    "thunderRoute": false,
    "escapeRoute": true,
    "heatZone": false,
    "duelArena": false
  },
  "12": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "出发碑",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "13": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "入院审核",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "14": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "强榜演武台",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "15": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "塔底危机",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "16": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "宗门决战碑",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "17": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "炎盟防线",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "18": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "雷云山口",
    "thunderRoute": true,
    "escapeRoute": true,
    "heatZone": false,
    "duelArena": false
  },
  "19": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "师门联络审核",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "20": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "大会成绩审核",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "21": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "星火收服台",
    "trialMode": "attunement",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "22": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "撤离确认",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "23": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "离墓审核",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "24": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "菩提观心审核",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "25": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "净莲收服台",
    "trialMode": "attunement",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "26": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "联盟出征台",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "27": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "本源传承审核",
    "trialMode": "assessment",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  },
  "28": {
    "spawn": {
      "x": 210,
      "y": 625
    },
    "gateLabel": "终战启程碑",
    "thunderRoute": false,
    "escapeRoute": false,
    "heatZone": false,
    "duelArena": false
  }
}
export function mapOverviewForChapter(id: number): MapOverview { return mapOverviews[id] ?? mapOverviews[0] }
