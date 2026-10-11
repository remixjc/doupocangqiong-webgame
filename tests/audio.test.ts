import { describe, expect, it, vi } from 'vitest'
import { SynthAudio, type Sound } from '../src/game/audio'

function fixture() {
  const param = () => ({
    cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(),
  })
  const gains: ReturnType<typeof makeGain>[] = []
  const oscillators: ReturnType<typeof makeOscillator>[] = []
  const makeGain = () => ({ gain: param(), connect: vi.fn(), disconnect: vi.fn() })
  const makeOscillator = () => ({
    frequency: param(), type: 'sine', connect: vi.fn(), disconnect: vi.fn(),
    start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null,
  })
  const context = {
    currentTime: 0, state: 'running', destination: {},
    createGain: vi.fn(() => { const node = makeGain(); gains.push(node); return node }),
    createOscillator: vi.fn(() => { const node = makeOscillator(); oscillators.push(node); return node }),
  }
  const synth = new SynthAudio(context as unknown as AudioContext, .3)
  return { context, synth, gains, oscillators }
}

describe('合成音效生命周期', () => {
  it('正在播放的声音通过同一个主增益响应实时音量，静音立即释放', () => {
    const { context, synth, gains, oscillators } = fixture()
    synth.play('skill')
    expect(gains[1].connect).toHaveBeenCalledWith(gains[0])
    context.currentTime = .1
    synth.setVolume(.6)
    expect(gains[0].gain.cancelScheduledValues).toHaveBeenLastCalledWith(.1)
    expect(gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(.6, .1, .015)
    expect(oscillators[0].disconnect).not.toHaveBeenCalled()
    synth.setVolume(0)
    expect(oscillators[0].stop).toHaveBeenLastCalledWith(.1)
    expect(oscillators[0].disconnect).toHaveBeenCalledTimes(1)
    expect(gains[1].disconnect).toHaveBeenCalledTimes(1)
    synth.stopAll()
    expect(oscillators[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('归一化音量，静音和非运行上下文均不创建声音', () => {
    const { context, synth, gains } = fixture()
    for (const volume of [-1, NaN, Infinity]) {
      synth.setVolume(volume); synth.play('attack')
      expect(gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, .015)
    }
    synth.setVolume(2)
    expect(gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, .015)
    for (const state of ['suspended', 'closed']) { context.state = state; synth.play('attack') }
    expect(context.createOscillator).not.toHaveBeenCalled()
  })

  it('同类限流，其他类独立，停止后不保留限流时间', () => {
    const { context, synth, oscillators } = fixture()
    synth.play('attack'); synth.play('attack'); synth.play('skill')
    expect(oscillators).toHaveLength(2)
    context.currentTime = .08; synth.play('attack')
    expect(oscillators).toHaveLength(2)
    context.currentTime = .1; synth.play('attack')
    expect(oscillators).toHaveLength(3)
    synth.stopAll(); synth.play('attack')
    expect(oscillators).toHaveLength(4)
  })

  it('最多八个声音，超额淘汰最早的，自然结束与旧回调幂等释放', () => {
    const { context, synth, gains, oscillators } = fixture()
    const kinds: Sound[] = ['attack', 'skill', 'dodge', 'hurt', 'collect', 'victory']
    for (let i = 0; i < 9; i++) {
      context.currentTime = i * .1; synth.play(kinds[i % kinds.length])
    }
    expect(oscillators[0].disconnect).toHaveBeenCalledTimes(1)
    expect(oscillators.slice(1).filter(node => node.disconnect.mock.calls.length === 0)).toHaveLength(8)
    const oldCallback = oscillators[1].onended!
    oldCallback(); oldCallback()
    expect(oscillators[1].disconnect).toHaveBeenCalledTimes(1)
    expect(gains[2].disconnect).toHaveBeenCalledTimes(1)
    synth.stopAll()
    expect(oscillators.every(node => node.disconnect.mock.calls.length === 1)).toBe(true)
    expect(gains.slice(1).every(node => node.disconnect.mock.calls.length === 1)).toBe(true)
    expect(gains[0].disconnect).not.toHaveBeenCalled()
  })

  it('启动异常清理已创建的节点，失败不会阻止立即重试', () => {
    const { context, synth, gains, oscillators } = fixture()
    const original = context.createOscillator.getMockImplementation()!
    context.createOscillator.mockImplementationOnce(() => {
      const node = original()
      node.start.mockImplementationOnce(() => { throw new Error('start failed') })
      return node
    })
    expect(() => synth.play('attack')).not.toThrow()
    expect(oscillators[0].disconnect).toHaveBeenCalledTimes(1)
    expect(gains[1].disconnect).toHaveBeenCalledTimes(1)
    synth.play('attack')
    expect(oscillators).toHaveLength(2)
    synth.stopAll()
  })

  it('创建节点异常时释放已有节点，不外抛', () => {
    const { context, synth, oscillators } = fixture()
    context.createGain.mockImplementationOnce(() => { throw new Error('gain unavailable') })
    expect(() => synth.play('collect')).not.toThrow()
    expect(oscillators[0].disconnect).toHaveBeenCalledTimes(1)
    context.createOscillator.mockImplementationOnce(() => { throw new Error('oscillator unavailable') })
    expect(() => synth.play('collect')).not.toThrow()
    synth.stopAll()
  })
})
