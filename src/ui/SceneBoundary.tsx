import { Eyebrow } from './NativeRegions'
import { SecondaryButton } from './Buttons'
import { Component, createRef, type ReactNode } from 'react'
import './scene-failure.css'
import { SceneLoadTimeout } from './scene-load'
import SaveStatus from './SaveStatus'
import { RecoveryBackup } from './SaveBackup'

interface Props { children: ReactNode; context?: 'scene' | 'panel' | 'save'; onFailure: () => void; onReload: () => void; onBack: () => void; onSave?: () => void }
export default class SceneBoundary extends Component<Props, { failed: boolean; timedOut: boolean }> {
  state = { failed: false, timedOut: false }
  private recovery = createRef<HTMLElement>()
  static getDerivedStateFromError(error: unknown) { return { failed: true, timedOut: error instanceof SceneLoadTimeout } }
  componentDidCatch() { this.props.onFailure(); this.recovery.current?.querySelector<HTMLButtonElement>('button')?.focus() }
  render() {
    if (!this.state.failed) return this.props.children
    return <section className={`scene-failure${this.props.context === 'panel' || this.props.context === 'save' ? ' in-panel' : ''}`} role="alert" ref={this.recovery}>
      <Eyebrow>旅途暂歇</Eyebrow><h3>{this.props.context === 'save' ? '存档管理暂时无法打开。' : this.props.context === 'panel' ? '这页旅途暂时无法展开。' : '山川画卷暂时停笔。'}</h3>
      <p>{this.props.context === 'save'
        ? this.state.timedOut ? '打开存档管理已等待超过20秒。自动保存状态如下；网络恢复后，可以等进度保存完成再刷新页面。' : '存档窗口遇到问题，旅途已暂停。请查看下方自动保存状态；保存完成后可以刷新，或返回大陆舆图。'
        : this.props.context === 'panel'
        ? this.state.timedOut ? '打开此页已等待超过20秒。网络恢复后请保存并刷新，再次翻阅。' : '本页遇到问题，旅途已暂停。可以查看存档、返回大陆舆图，或等进度保存后刷新页面。'
        : this.state.timedOut ? '展开场景已等待超过20秒。网络恢复后请保存并刷新页面，再次启程。' : '本次场景遇到问题，已暂停旅途。可以查看存档、返回大陆舆图，或等进度保存完成后刷新页面。'}</p>
      <SaveStatus />
      <RecoveryBackup />
      <div className="bond-actions">
        <button className="primary small" onClick={this.props.onReload}>保存后刷新页面</button>
        {this.props.context !== 'save' && this.props.onSave && <SecondaryButton onClick={this.props.onSave}>打开存档管理</SecondaryButton>}
        <SecondaryButton onClick={this.props.onBack}>返回大陆舆图</SecondaryButton>
      </div>
    </section>
  }
}
