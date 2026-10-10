import { useState } from 'react'

export default function App() {
  const [section, setSection] = useState<'home' | 'guide'>('home')
  return <div className="shell">
    <header className="topbar">
      <a className="brand" href="./"><span className="brand-seal">炎</span><span>斗破苍穹<small>异 火 之 路</small></span></a>
      <nav aria-label="主导航">
        <button className={section === 'home' ? 'nav active' : 'nav'} onClick={() => setSection('home')}>启程</button>
        <button className={section === 'guide' ? 'nav active' : 'nav'} onClick={() => setSection('guide')}>修炼手札</button>
      </nav>
      <span className="version-label">浏览器单机 · 开发中</span>
    </header>
    <main className="landing">
      <div className="landscape" />
      {section === 'home' ? <section className="hero">
        <span className="eyebrow"><i /> 从乌坦城，走向斗气大陆</span>
        <h1>以少年之名<br /><em>赴异火之约。</em></h1>
        <p>一枚古戒，一位老师，一条不向命运低头的路。<br />探索山川，磨砺斗技，以掌中之火照亮新的旅途。</p>
        <div className="hero-actions"><button className="primary" onClick={() => setSection('guide')}>阅读修炼手札 <span>↗</span></button><span className="muted">基础工程阶段</span></div>
        <div className="hero-stats"><div><b>28</b><span>主线篇章规划</span></div><div><b>焚诀</b><span>异火成长之路</span></div><div><b>纯网页</b><span>无需安装客户端</span></div></div>
      </section> : <section className="guide-panel panel">
        <span className="eyebrow">修炼手札 / 初心</span><h2>每一份力量，都来自历练。</h2>
        <p>探索采药 → 实战历练 → 炼药准备 → 章节挑战 → 境界成长。</p>
        <div className="guide-grid">{[['WASD / 方向键', '移动'], ['J / 鼠标', '普攻'], ['空格', '闪避'], ['1 · 2 · 3', '斗技'], ['E', '交互'], ['Q', '服用丹药']].map(([key, label]) => <div key={label}><kbd>{key}</kbd><span>{label}</span></div>)}</div>
        <p className="muted">当前为基础工程版本，后续阶段加入可玩探索、战斗和存档。</p>
        <button className="secondary" onClick={() => setSection('home')}>返回启程</button>
      </section>}
      <aside className="landing-note"><span className="vertical-title">万 火 归 一</span><span>斗气大陆 · 故事改编</span></aside>
      <footer className="landing-footer"><span>原创短对白 · 程序绘制场景 · 单机冒险</span><span>漫长的旅途，从此刻开始。</span></footer>
    </main>
  </div>
}
