"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { auth, db } from "../lib/firebase"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import SentenceInput from "@/components/SentenceInput"
import SentenceDisplay from "@/components/SentenceDisplay"
import { Toaster } from "@/components/ui/toaster"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, TrendingUp } from "lucide-react"
import SentenceCanvas from "@/components/SentenceCanvas"
import LanguageSelector, { DEMO_SENTENCES, SUPPORTED_LANGUAGES } from "@/components/LanguageSelector"
import { Button } from "@/components/ui/button"
import { Sentence, LLMResponse } from "@/types"
import { Achievement } from "@/types/progress"
import { ProgressTracker } from "@/lib/progress-tracker"
import ProgressDashboard from "@/components/ProgressDashboard"
import AchievementNotification from "@/components/AchievementNotification"

// Type adapter to convert between Canvas and Sidebar LLMResponse formats
const adaptLLMResponse = (response: LLMResponse): LLMResponse => {
  if (!response.result) {
    return {
      result: {
        sentence: response.sentence || {},
        relationship_matrix: Array.isArray(response.relationship_matrix) 
          ? response.relationship_matrix.flat()
          : []
      }
    };
  }
  return response;
};

// Type adapter to convert between Canvas and Sidebar Sentence formats
const adaptSentence = (sentence: Sentence): Sentence => ({
  ...sentence,
  llmResponse: adaptLLMResponse(sentence.llmResponse)
});

// Helper to flatten a 2D array
const flattenMatrix = (matrix: number[][]) => matrix.reduce((acc, row) => acc.concat(row), []);
// Helper to unflatten a flat array into 2D
const unflattenMatrix = (flat: number[], size: number) => {
  const matrix = [];
  for (let i = 0; i < flat.length; i += size) {
    matrix.push(flat.slice(i, i + size));
  }
  return matrix;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('italian')
  const [showInput, setShowInput] = useState(false)
  const [showProgressDashboard, setShowProgressDashboard] = useState(false)
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [progressTracker, setProgressTracker] = useState<ProgressTracker | null>(null)

  const isMobile = useIsMobile()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
      if (currentUser) {
        fetchSentences(currentUser.uid)
        setProgressTracker(new ProgressTracker(currentUser.uid))
      } else {
        setSentences([])
        setProgressTracker(null)
      }
    })

    return () => unsubscribe()
  }, [])



  const fetchSentences = async (userId: string) => {
    try {
      const q = query(collection(db, "sentences"), where("userId", "==", userId))
      const querySnapshot = await getDocs(q)
      
      const sentenceList = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        let llmResponse = data.llmResponse;

        // Ensure the response has the correct structure
        if (!llmResponse?.result?.sentence) {
          llmResponse = {
            result: {
              sentence: {},
              relationship_matrix: []
            }
          };
        }

        return {
          ...data,
          id: doc.id,
          llmResponse
        } as Sentence
      })
      
      const sortedSentences = sentenceList.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
      setSentences(sortedSentences)
    } catch (error) {
      console.error("Error fetching sentences:", error)
    }
  }

  const addSentence = async (sentence: string, llmResponse: any) => {
    // Ensure the data structure matches what we expect
    let relationship_matrix = llmResponse.result?.result?.relationship_matrix || [];
    if (Array.isArray(relationship_matrix) && Array.isArray(relationship_matrix[0])) {
      relationship_matrix = flattenMatrix(relationship_matrix);
    }

    const formattedResponse: LLMResponse = {
      result: {
        sentence: llmResponse.result?.result?.sentence || {},
        relationship_matrix: Array.isArray(relationship_matrix) ? relationship_matrix : []
      }
    }

    const newSentence: Sentence = {
      id: Date.now().toString(),
      userId: user ? user.uid : "anonymous",
      sentence: sentence,
      llmResponse: formattedResponse,
      timestamp: Timestamp.now(),
    }

    setCurrentSentence(newSentence)

    if (user && progressTracker) {
      try {
        const docRef = await addDoc(collection(db, "sentences"), newSentence)
        fetchSentences(user.uid)
        
        // Track progress and check for achievements
        const achievements = await progressTracker.recordSentenceAnalysis(sentence, selectedLanguage)
        if (achievements.length > 0) {
          setNewAchievements(achievements)
        }
      } catch (error) {
        console.error("Error adding sentence:", error)
        throw error
      }
    }
  }

  const handleDemoSentenceSelect = (sentence: string, llmResponse: any) => {

    // Ensure the data structure matches what we expect
    let relationship_matrix = llmResponse.result?.relationship_matrix || [];
    if (Array.isArray(relationship_matrix) && Array.isArray(relationship_matrix[0])) {
      relationship_matrix = flattenMatrix(relationship_matrix);
    }

    const formattedResponse: LLMResponse = {
      result: {
        sentence: llmResponse.result?.sentence || {},
        relationship_matrix: Array.isArray(relationship_matrix) ? relationship_matrix : []
      }
    }



    const newSentence: Sentence = {
      id: Date.now().toString(),
      userId: user ? user.uid : "anonymous",
      sentence: sentence,
      llmResponse: formattedResponse,
      timestamp: Timestamp.now(),
    }

    // Clear selected sentence and set current sentence
    setSelectedSentence(null)
    setCurrentSentence(newSentence)
  }

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language)
  }

  const selectSentence = (sentence: Sentence) => {
    setSelectedSentence(sentence)
  }

  const deleteSentence = async (sentenceId: string) => {
    try {
      await deleteDoc(doc(db, "sentences", sentenceId))
      setSentences(sentences.filter(s => s.id !== sentenceId))
      if (selectedSentence?.id === sentenceId) {
        setSelectedSentence(null)
      }
    } catch (error) {
      console.error("Error deleting sentence:", error)
      throw error
    }
  }

  const handleNewSentence = () => {
    setSelectedSentence(null)
    setCurrentSentence(null)
  }

  // Convert sentences to the format expected by Sidebar
  const sidebarSentences = sentences.map(sentence => sentence)

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        sentences={sentences}
        onSelectSentence={selectSentence}
        onDeleteSentence={deleteSentence}
        onNewSentence={handleNewSentence}
        user={user}
        initialIsOpen={!isMobile}
      />
      <div className="flex-1 flex flex-col h-full">
        <Header user={user} />
        <main className="flex-1 relative">
          <div className="absolute inset-0">
            {selectedSentence ? (
              <SentenceDisplay 
                data={selectedSentence.llmResponse} 
                title="Selected Sentence"
                sentence={selectedSentence.sentence}
                onQuizComplete={async (score, total) => {
                  if (progressTracker) {
                    const achievements = await progressTracker.recordQuizCompletion(score, total, selectedLanguage)
                    if (achievements.length > 0) {
                      setNewAchievements(achievements)
                    }
                  }
                }}
                onVocabularyExpand={async (word) => {
                  if (progressTracker) {
                    const achievements = await progressTracker.recordVocabularyExpansion(word, selectedLanguage)
                    if (achievements.length > 0) {
                      setNewAchievements(achievements)
                    }
                  }
                }}
              />
            ) : currentSentence ? (
              <SentenceDisplay 
                data={currentSentence.llmResponse} 
                title="Analyzed Sentence"
                sentence={currentSentence.sentence}
                onQuizComplete={async (score, total) => {
                  if (progressTracker) {
                    const achievements = await progressTracker.recordQuizCompletion(score, total, selectedLanguage)
                    if (achievements.length > 0) {
                      setNewAchievements(achievements)
                    }
                  }
                }}
                onVocabularyExpand={async (word) => {
                  if (progressTracker) {
                    const achievements = await progressTracker.recordVocabularyExpansion(word, selectedLanguage)
                    if (achievements.length > 0) {
                      setNewAchievements(achievements)
                    }
                  }
                }}
              />
            ) : null}
          </div>
          {/* Top-left toolbar for sentence controls */}
          <div className="absolute top-4 left-4 z-30 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowInput(!showInput)}
              title="New Sentence"
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              +
            </Button>
            <LanguageSelector 
              onLanguageSelect={handleLanguageSelect}
              onDemoSentenceSelect={handleDemoSentenceSelect}
            />
            {user && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowProgressDashboard(true)}
                title="Progress Dashboard"
                className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            )}
          </div>
          {/* Sentence input form */}
          {showInput && (
            <div className="absolute inset-0 z-40 bg-background/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] sm:w-[500px]">
                <SentenceInput
                  onSubmit={addSentence}
                  onCancel={() => setShowInput(false)}
                  selectedLanguage={selectedLanguage}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      <Toaster />
      
      {/* Progress Dashboard Modal */}
      {showProgressDashboard && user && (
        <ProgressDashboard
          userId={user.uid}
          onClose={() => setShowProgressDashboard(false)}
        />
      )}
      
      {/* Achievement Notifications */}
      {newAchievements.length > 0 && (
        <AchievementNotification
          achievements={newAchievements}
          onClose={() => setNewAchievements([])}
        />
      )}
    </div>
  )
}

