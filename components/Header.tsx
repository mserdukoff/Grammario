import type { User } from "firebase/auth"
import { signOut } from "firebase/auth"
import { auth } from "../lib/firebase"
import { Button } from "@/components/ui/button"
import Login from "./Login"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

interface HeaderProps {
  user: User | null
}

export default function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      console.log("User signed out successfully")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="bg-background border-b">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
          </Button>
          <Link href="/about" passHref>
            <Button variant="ghost">More about Grammario</Button>
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span>Welcome, {user.email || "User"}</span>
              <Button onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <span>Login to save your history</span>
              <Login onLogin={() => console.log("User logged in")} />
            </>
          )}
        </div>
      </div>
    </header>
  )
}

