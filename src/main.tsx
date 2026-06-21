import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppDataProvider } from './hooks/useAppData'
import { PrivacyProvider } from './hooks/usePrivacy'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppDataProvider>
      <PrivacyProvider>
        <App />
      </PrivacyProvider>
    </AppDataProvider>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch((error: unknown) => {
        console.error('Service worker registration failed:', error)
      })
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
