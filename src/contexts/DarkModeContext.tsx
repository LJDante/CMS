import React, { createContext, useContext, useEffect, useState } from 'react'

interface DarkModeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Initialize on mount
    const stored = localStorage.getItem('darkMode')
    let initialDarkMode = false

    if (stored !== null) {
      initialDarkMode = stored === 'true'
    } else {
      // Check system preference
      initialDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    setIsDarkMode(initialDarkMode)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Update localStorage
    localStorage.setItem('darkMode', String(isDarkMode))

    // Update DOM
    console.log('Applying dark mode:', isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    console.log('HTML classes after update:', document.documentElement.className)
  }, [isDarkMode, mounted])

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev)
  }

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error('useDarkMode must be used within DarkModeProvider')
  }
  return context
}
