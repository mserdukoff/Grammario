'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import SentenceInput from '@/components/SentenceInput'
import SentenceDisplay from '@/components/SentenceDisplay'
import { Toaster } from "@/components/ui/toaster"

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
    if (user) {
      try {
        const flattenedResponse = JSON.parse(JSON.stringify(llmResponse), (key, value) => {
          if (Array.isArray(value)) {
            return value.flat();
          }
          return value;
        });

        const docRef = await addDoc(collection(db, 'sentences'), {
          userId: user.uid,
          sentence: sentence,
          llmResponse: flattenedResponse,
          timestamp: Timestamp.now()
        });
        console.log('Sentence added with ID:', docRef.id);
        fetchSentences(user.uid);
      } catch (error) {
        console.error('Error adding sentence:', error);
        throw error;
      }
    } else {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }
  };

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
  }

  const handleNewSentence = () => {
    setSelectedSentence(null);
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
      />
      <div className="flex-1 flex flex-col overflow-hidden h-screen">
        <Header user={user} />
        <main className="flex-1 p-8 overflow-auto pb-16">
          {selectedSentence ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Selected Sentence</h2>
              <p className="mb-4">{selectedSentence.sentence}</p>
              <SentenceDisplay data={selectedSentence.llmResponse} />
            </div>
          ) : (
            <SentenceInput onAddSentence={addSentence} user={user} />
          )}
        </main>
      </div>
      <Toaster />
    </div>
  )
}

