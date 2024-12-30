import { User } from 'firebase/auth'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { Button } from '@/components/ui/button'
import Login from './Login'
import Image from 'next/image'

interface HeaderProps {
  user: User | null
}

export default function Header({ user }: HeaderProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Image src="/logoplaceholder.svg" alt="Logo" width={32} height={32} />
        <div className="flex items-center">
          {user ? (
            <Button onClick={handleLogout}>Logout</Button>
          ) : (
            <Login onLogin={() => console.log('User logged in')} />
          )}
        </div>
      </div>
    </header>
  )
}

