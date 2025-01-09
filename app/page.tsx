'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SentenceInput from '@/components/SentenceInput'
import SentenceDisplay from '@/components/SentenceDisplay'
import { Toaster } from "@/components/ui/toaster"
import { useIsMobile } from '@/components/hooks/use-mobile'

interface WordInfo {
  position: number;
  part_of_speech: string;
  root: string | null;
  noun_components: {
    affixes: string | null;
  };
  noun_case: string | null;
  noun_case_components: string | null;
  verb_tense: string | null;
  verb_tense_components: string[] | null;
}

export interface LLMResponse {
  sentence: {
    [word: string]: WordInfo;
  };
  relationship_matrix: number[][] | number[] | { [key: string]: number };
}

interface Sentence {
  id: string;
  userId: string;
  sentence: string;
  llmResponse: LLMResponse;
  timestamp: Timestamp;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null)

  const isMobile = useIsMobile()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
      if (currentUser) {
        fetchSentences(currentUser.uid)
      } else {
        setSentences([])
      }
    })

    return () => unsubscribe()
  }, [])

  const fetchSentences = async (userId: string) => {
    try {
      const q = query(collection(db, 'sentences'), where('userId', '==', userId))
      const querySnapshot = await getDocs(q)
      const sentenceList = querySnapshot.docs.map(doc => {
        const data = doc.data() as Sentence
        const sortedSentence = Object.entries(data.llmResponse.sentence)
          .sort((a, b) => a[1].position - b[1].position)
          .reduce((acc, [word, info]) => {
            acc[word] = info
            return acc
          }, {} as { [key: string]: WordInfo })
        
        return {
          ...data,
          id: doc.id,
          llmResponse: {
            ...data.llmResponse,
            sentence: sortedSentence
          }
        }
      })
      const sortedSentences = sentenceList.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
      setSentences(sortedSentences)
    } catch (error) {
      console.error('Error fetching sentences:', error)
    }
  }

  const addSentence = async (sentence: string, llmResponse: LLMResponse) => {
    const newSentence: Sentence = {
      id: Date.now().toString(), // Use a timestamp as a temporary ID
      userId: user ? user.uid : 'anonymous',
      sentence: sentence,
      llmResponse: llmResponse,
      timestamp: Timestamp.now()
    }

    setCurrentSentence(newSentence)

    if (user) {
      try {
        const docRef = await addDoc(collection(db, 'sentences'), newSentence);
        console.log('Sentence added with ID:', docRef.id);
        fetchSentences(user.uid);
      } catch (error) {
        console.error('Error adding sentence:', error);
        throw error;
      }
    }
  }

  const deleteSentence = async (sentenceId: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'sentences', sentenceId));
        console.log('Sentence deleted with ID:', sentenceId);
        setSentences(sentences.filter(sentence => sentence.id !== sentenceId));
        if (selectedSentence && selectedSentence.id === sentenceId) {
          setSelectedSentence(null);
        }
      } catch (error) {
        console.error('Error deleting sentence:', error);
        throw error;
      }
    } else {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
  }

  const selectSentence = (sentence: Sentence) => {
    setSelectedSentence(sentence);
    setCurrentSentence(null);
  }

  const handleNewSentence = () => {
    setSelectedSentence(null);
    setCurrentSentence(null);
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar 
        sentences={sentences} 
        onDeleteSentence={deleteSentence}
        onSelectSentence={selectSentence}
        onNewSentence={handleNewSentence}
        user={user ? { ...user, email: user.email || '' } : null}
        initialIsOpen={!isMobile}
      />
      <div className="flex-1 flex flex-col overflow-hidden h-screen">
        <Header user={user ? { ...user, email: user.email || '' } : null} />
        <main className="flex-1 p-8 overflow-auto">
          {selectedSentence ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Selected Sentence</h2>
              <p className="mb-4">{selectedSentence.sentence}</p>
              <SentenceDisplay data={selectedSentence.llmResponse} />
            </div>
          ) : currentSentence ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Analyzed Sentence</h2>
              <p className="mb-4">{currentSentence.sentence}</p>
              <SentenceDisplay data={currentSentence.llmResponse} />
            </div>
          ) : (
            <SentenceInput onAddSentence={addSentence} />
          )}
        </main>
        <Footer />
      </div>
      <Toaster />
    </div>
  )
}

