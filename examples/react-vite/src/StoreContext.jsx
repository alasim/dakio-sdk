import { createContext, useContext, useEffect, useState } from 'react'
import { loadPixel } from '@dakio/sdk/pixel'
import { dakio } from './dakio.js'

// The store (name, logo, delivery rates, Pixel) and its categories, loaded once.
const StoreContext = createContext({ store: null, categories: [], error: null })

export function StoreProvider({ children }) {
  const [value, setValue] = useState({ store: null, categories: [], error: null })

  useEffect(() => {
    Promise.all([dakio.store.get(), dakio.categories.list()])
      .then(([store, categories]) => {
        setValue({ store, categories, error: null })
        document.title = store.name
        if (store.accentColor) document.documentElement.style.setProperty('--accent', store.accentColor)
        if (store.faviconUrl) {
          const link = document.querySelector('link[rel=icon]') || Object.assign(document.createElement('link'), { rel: 'icon' })
          link.href = store.faviconUrl
          document.head.appendChild(link)
        }
        loadPixel(store.tracking.metaPixelId)
      })
      .catch((error) => setValue((v) => ({ ...v, error })))
  }, [])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)
