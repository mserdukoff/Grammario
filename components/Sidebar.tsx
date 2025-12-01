import { useState, useEffect } from 'react'
import Logo from './Logo'
import { Timestamp } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, History, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { formatTimestamp } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { User as FirebaseUser } from 'firebase/auth'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { motion, AnimatePresence } from 'framer-motion'
import { Sentence } from '@/types'

interface WordInfo {
  position: number;
  part_of_speech: string;
  root: string | null;
  gender: string | null;
  noun_components: {
    affixes: string | null;
  };
  noun_case: string | null;
  noun_case_components: string | null;
  verb_tense: string | null;
  verb_tense_components: string[] | null;
}

interface LLMResponse {
  result: {
    sentence: {
      [word: string]: WordInfo;
    };
    relationship_matrix: number[][];
  };
}

interface SidebarProps {
  sentences: Sentence[];
  onDeleteSentence: (sentenceId: string) => Promise<void>;
  onSelectSentence: (sentence: Sentence) => void;
  onNewSentence: () => void;
  onShowProgress: () => void;
  user: FirebaseUser | null;
  initialIsOpen: boolean;
}

export default function Sidebar({ sentences, onDeleteSentence, onSelectSentence, onNewSentence, onShowProgress, user, initialIsOpen }: SidebarProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(initialIsOpen)
  const [deletingSentenceId, setDeletingSentenceId] = useState<string | null>(null)

  useEffect(() => {
    setIsOpen(initialIsOpen)
  }, [initialIsOpen])

  const handleDelete = async (sentenceId: string) => {
    try {
      await onDeleteSentence(sentenceId)
      setDeletingSentenceId(null)
    } catch (error) {
      console.error('Error deleting sentence:', error)
      alert('Failed to delete sentence. Please try again.')
    }
  }

  return (
    <aside className={`bg-background border-r border-border transition-all duration-300 ${isOpen ? 'w-64' : 'w-16'} overflow-hidden flex flex-col h-screen`}>
      <div className="p-4 flex justify-between items-center">
        <Logo collapsed={!isOpen} />
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full hover:bg-accent"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          variant="ghost"
          size="icon"
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex-grow overflow-y-auto">
        <div className={`px-4 py-2 ${isOpen ? 'block' : 'flex justify-center'}`}>
          {isOpen ? (
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              History
            </h2>
          ) : (
            <History className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        
        {/* Progress Dashboard Button */}
        <div className="px-4 py-2">
          <Button
            variant="ghost"
            className={`w-full ${isOpen ? 'justify-start' : 'justify-center'}`}
            onClick={onShowProgress}
          >
            {isOpen ? (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Progress
              </>
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="mt-2 px-4">
          {!user && isOpen ? (
            <p className="text-sm text-muted-foreground">Sign in to save and view your sentence history.</p>
          ) : sentences.length === 0 && isOpen ? (
            <p className="text-sm text-muted-foreground">No sentences yet. Add some to see your history.</p>
          ) : (
            sentences.map((sentence) => (
              <div 
                key={sentence.id}
                className="flex items-center p-2 hover:bg-accent rounded-lg cursor-pointer"
                onClick={() => onSelectSentence(sentence)}
              >
                {isOpen ? (
                  <>
                    <div className="flex-grow mr-2 overflow-hidden">
                      <p className="text-sm truncate text-foreground">
                        {sentence.sentence}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatTimestamp(sentence.timestamp)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingSentenceId(sentence.id)
                      }}
                      aria-label="Delete sentence"
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="w-full flex justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </nav>
      <AlertDialog open={!!deletingSentenceId} onOpenChange={() => setDeletingSentenceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sentence from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingSentenceId && handleDelete(deletingSentenceId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

