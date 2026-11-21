import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/manrope'
import './styles/index.css'
import { App } from './app/App'
import { api } from './lib/api'

// A remembered member is confirmed with the API (a session that has ended signs them out).
void api.restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support. Only in the built app: during development it would keep serving old files.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const register = () =>
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* The app works the same without it. */
    })
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}
