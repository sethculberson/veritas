import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

// TypeScript knows `getElementById` might return null, so we assert it's not null
if (!rootElement) throw new Error("Failed to find the root element")

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
