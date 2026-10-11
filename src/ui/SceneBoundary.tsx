import { Component, type ReactNode } from 'react'
import './scene-failure.css'

interface Props { children: ReactNode; onFailure: () => void; onReload: () => void; onBack: () => void; onSave: () => void }
export default class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() {
    if (!this.state.failed) return this.props.children
    return <section className="scene-failure" role="alert">
      <span className="eyebrow">旅途暂歇</span><h3>山川画卷未能展开。</h3>
      <p>本次场景未能加载。可以查看存档、返回大陆舆图，或等进度保存完成后刷新页面。</p>
      <div className="bond-actions">
        <button className="primary small" onClick={this.props.onReload}>保存后刷新页面</button>
        <button className="secondary" onClick={this.props.onSave}>打开存档管理</button>
        <button className="secondary" onClick={this.props.onBack}>返回大陆舆图</button>
      </div>
    </section>
  }
}
