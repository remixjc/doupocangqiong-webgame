export class NewerSaveVersionError extends Error {
  constructor(protectedAutomatic = false) {
    super(protectedAutomatic
      ? '这是较新版本的存档，请先更新游戏。原有自动档已保护，本版本不会覆盖它；当前旅途可导出JSON备份。'
      : '这是较新版本的存档，请先更新游戏。原有存档没有被修改。')
    this.name = 'NewerSaveVersionError'
  }
}
