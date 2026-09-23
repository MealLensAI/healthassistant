import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type PageHeaderState = {
  title?: string
  actions?: ReactNode
}

type PageHeaderApi = {
  setHeader: (next: PageHeaderState) => void
  clearHeader: () => void
}

const PageHeaderApiContext = createContext<PageHeaderApi | null>(null)
const PageHeaderStateContext = createContext<PageHeaderState>({})

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<PageHeaderState>({})

  const setHeader = useCallback((next: PageHeaderState) => {
    setHeaderState(next)
  }, [])

  const clearHeader = useCallback(() => {
    setHeaderState({})
  }, [])

  const api = useMemo(() => ({ setHeader, clearHeader }), [setHeader, clearHeader])

  return (
    <PageHeaderApiContext.Provider value={api}>
      <PageHeaderStateContext.Provider value={header}>{children}</PageHeaderStateContext.Provider>
    </PageHeaderApiContext.Provider>
  )
}

/** Register page title / actions into the shared top bar for this route. */
export function usePageHeader(title?: string, actions?: ReactNode) {
  const api = useContext(PageHeaderApiContext)

  useEffect(() => {
    if (!api) return
    api.setHeader({ title, actions })
    return () => api.clearHeader()
  }, [api, title, actions])
}

export function usePageHeaderState() {
  return useContext(PageHeaderStateContext)
}
