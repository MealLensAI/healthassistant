import { createContext } from 'react'
import type { AppContextValue } from './context'

// Keep context identity outside the React Refresh component module. Editing
// AppProvider must not create a second context for consumers still mounted.
export const AppContext = createContext<AppContextValue | null>(null)
