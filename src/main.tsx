import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'
import './ui/styles.css'
import './ui/game.css'
import './ui/panels.css'
import './ui/content.css'
import './ui/experience.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
