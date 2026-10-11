import { Component, type ReactNode } from 'react'
import './scene-failure.css'
import { SceneLoadTimeout } from './scene-load'

interface Props { children: ReactNode; onFailure: () => void; onReload: () => void; onBack: () => void; onSave: () => void }
export default class SceneBoundary extends Component<Props, { failed: boolean; timedOut: boolean }> {
  state = { failed: false, timedOut: false }
  static getDerivedStateFromError(error: unknown) { return { failed: true, timedOut: error instanceof SceneLoadTimeout } }
  componentDidCatch() { this.props.onFailure() }
  render() {
    if (!this.state.failed) return this.props.children
    return <section className="scene-failure" role="alert">
      <span className="eyebrow">旅途暂歇</span><h3>山川画卷未能展开。</h3>
      <p>{this.state.timedOut ? '展开场景已等待超过20秒。网络恢复后请保存并刷新页面，再次启程。' : '本次场景未能加载。可以查看存档、返回大陆舆图，或等进度保存完成后刷新页面。'}</p>
      <div className="bond-actions">
        <button className="primary small" onClick={this.props.onReload}>保存后刷新页面</button>
        <button className="secondary" onClick={this.props.onSave}>打开存档管理</button>
        <button className="secondary" onClick={this.props.onBack}>返回大陆舆图</button>
      </div>
    </section>
  }
}
