"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import AdminDashboard from "@/components/AdminDashboard"
import Header from "@/components/Header"
import { auth } from "@/lib/firebase"

const ADMIN_UID = "NFRmYOAhcgeulxcQQsBKutehfUh1"

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Check if user is authenticated and has the correct UID
  if (!user || user.uid !== ADMIN_UID) {
    return (
      <div className="flex flex-col h-screen">
        <Header user={user} />
        <main className="flex-1 overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground">
              You do not have permission to access this page.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Header user={user} />
      <main className="flex-1 overflow-hidden">
        <AdminDashboard />
      </main>
    </div>
  )
}

