export const firstHallAfternoonScenes = [
  ['arrive-early', '前段到达', '同伴与同卷随行。'],
  ['time-early', '午后前段', '停留短谈，继续同行。'],
  ['arrive-middle', '中段到达', '曲折山路走完。'],
  ['time-middle', '午后中段', '树影移动，交谈继续。'],
  ['arrive-late', '后段到达', '同伴仍在身侧。'],
  ['time-late', '午后后段', '三段时光，夜色待续。'],
  ['twilight', '暮色初现', '山间渐暗。'],
  ['dark', '山间天黑', '仍在山上，回房另续。'],
  ['review', '整个午后回顾', '三路段、三时段与夜色齐备。'],
  ['archive', '午后与天黑归档', '山上位置保留。'],
].map(([operation, title, text]) => ({ operation, title, text, action: `记下${title}` }))
