'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  const toggleDarkMode = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'enabled')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('darkMode', 'disabled')
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const shouldDark = stored === 'enabled' || (!stored && media.matches)
    document.documentElement.classList.toggle('dark', shouldDark)
    setIsDark(shouldDark)

    const handleChange = (event: MediaQueryListEvent) => {
      const hasPreference = localStorage.getItem('darkMode')
      if (hasPreference) {
        return
      }
      document.documentElement.classList.toggle('dark', event.matches)
      setIsDark(event.matches)
    }

    media.addEventListener('change', handleChange)
    return () => {
      media.removeEventListener('change', handleChange)
    }
  }, [])

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      ) : (
        <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      )}
    </button>
  )
}
