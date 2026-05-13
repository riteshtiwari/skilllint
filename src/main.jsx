import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { clerkAppearance } from './tokens.js'
import './index.css'
import App from './App.jsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_KEY) throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not set");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY} appearance={clerkAppearance}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
