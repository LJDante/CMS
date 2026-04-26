import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../contexts/DarkModeContext'

export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  const handleClick = () => {
    toggleDarkMode()
  }

  return (
    <button
      onClick={handleClick}
      className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="Toggle dark mode"
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
