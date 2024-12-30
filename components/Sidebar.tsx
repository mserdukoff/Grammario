import { useState } from 'react'
import Image from 'next/image'
import { Timestamp } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'

interface Sentence {
  id: string
  userId: string
  sentence: string
  llmResponse: any
  timestamp: Timestamp
}

interface SidebarProps {
  sentences: Sentence[]
  onDeleteSentence: (sentenceId: string) => Promise<void>
  onSelectSentence: (sentence: Sentence) => void
  onNewSentence: () => void
}

export default function Sidebar({ sentences, onDeleteSentence, onSelectSentence, onNewSentence }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)

  const handleDelete = async (e: React.MouseEvent, sentenceId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this sentence?')) {
      try {
        await onDeleteSentence(sentenceId)
      } catch (error) {
        console.error('Error deleting sentence:', error)
        alert('Failed to delete sentence. Please try again.')
      }
    }
  }

  return (
    <aside className={`bg-white shadow-md transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'} overflow-hidden flex flex-col`}>
      <div className="p-4 flex justify-between items-center">
        <Image src="/logoplaceholder.svg" alt="Logo" width={32} height={32} className={isOpen ? 'block' : 'hidden'} />
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-gray-200">
          {isOpen ? '←' : '→'}
        </button>
      </div>
      <div className="px-4 mb-4">
        <Button onClick={onNewSentence} className="w-full flex items-center justify-center">
          <Plus className="mr-2 h-4 w-4" /> New Sentence
        </Button>
      </div>
      <nav className="flex-grow overflow-y-auto">
        <h2 className={`px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide ${isOpen ? 'block' : 'hidden'}`}>
          History
        </h2>
        <div className="mt-2 px-4">
          {sentences.length === 0 ? (
            <p className="text-sm text-gray-500">No sentences yet. Add some or sign in to save your history.</p>
          ) : (
            sentences.map((sentence) => (
              <div 
                key={sentence.id} 
                className={`py-2 flex justify-between items-center ${isOpen ? 'block' : 'hidden'} cursor-pointer hover:bg-gray-100`}
                onClick={() => onSelectSentence(sentence)}
              >
                <div className="flex-grow mr-2 overflow-hidden">
                  <p className="text-sm truncate">{sentence.sentence}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {sentence.timestamp.toDate().toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDelete(e, sentence.id)}
                  aria-label="Delete sentence"
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </nav>
    </aside>
  )
}

