import type { User } from "firebase/auth"
import { signOut } from "firebase/auth"
import { auth } from "../lib/firebase"
import { Button } from "@/components/ui/button"
import Login from "./Login"
import { Moon, Sun, Database } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useEffect, useState } from "react"

interface HeaderProps {
  user: User | null
}

export default function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="bg-background border-b">
      <div className="relative w-full h-16 px-4">
        <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme} 
              aria-label="Toggle theme"
              className="flex-shrink-0"
              suppressHydrationWarning
            >
              {mounted ? (
                theme === "dark" ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              )}
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                <span className="text-sm hidden sm:inline">Welcome, {user.email || "User"}</span>
                <Button onClick={handleLogout} variant="ghost" size="sm">Logout</Button>
              </>
            ) : (
              <>
                <span className="text-sm hidden sm:inline">Login to save your history</span>
                <Login onLogin={() => {}} />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

