import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LLMProvider } from './contexts/LLMProvider';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LLMProvider>
      <App />
    </LLMProvider>
  </StrictMode>,
)
