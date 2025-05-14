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
import { AlertTriangle } from "lucide-react"
import SentenceCanvas from "@/components/SentenceCanvas"
import LanguageSelector from "@/components/LanguageSelector"
import { Button } from "@/components/ui/button"

interface WordInfo {
  position: number
  part_of_speech: string
  root: string | null
  noun_components: {
    affixes: string | null
  }
  noun_case: string | null
  noun_case_components: string | null
  verb_tense: string | null
  verb_tense_components: string[] | null
}

interface CanvasLLMResponse {
  result: {
    sentence: {
      [word: string]: WordInfo
    }
    relationship_matrix: number[][]
  }
}

interface SidebarLLMResponse {
  sentence: {
    [word: string]: WordInfo
  }
  relationship_matrix: number[][] | number[] | { [key: string]: number }
}

interface CanvasSentence {
  id: string
  userId: string
  sentence: string
  llmResponse: CanvasLLMResponse
  timestamp: Timestamp
}

interface SidebarSentence {
  id: string
  userId: string
  sentence: string
  llmResponse: SidebarLLMResponse
  timestamp: Timestamp
}

// Type adapter to convert between Canvas and Sidebar LLMResponse formats
const adaptLLMResponse = (response: CanvasLLMResponse): SidebarLLMResponse => ({
  sentence: response.result?.sentence || {},
  relationship_matrix: response.result?.relationship_matrix || []
})

// Type adapter to convert between Canvas and Sidebar Sentence formats
const adaptSentence = (sentence: CanvasSentence): SidebarSentence => ({
  ...sentence,
  llmResponse: adaptLLMResponse(sentence.llmResponse)
})

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
  const [sentences, setSentences] = useState<CanvasSentence[]>([])
  const [selectedSentence, setSelectedSentence] = useState<CanvasSentence | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentSentence, setCurrentSentence] = useState<CanvasSentence | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('italian')
  const [showInput, setShowInput] = useState(false)

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
      const q = query(collection(db, "sentences"), where("userId", "==", userId))
      const querySnapshot = await getDocs(q)
      console.log("Raw Firebase data:", querySnapshot.docs.map(doc => doc.data()))
      
      const sentenceList = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        console.log("Processing document:", data)
        let llmResponse = data.llmResponse;

        // Compatibility: if llmResponse is not nested under .result, wrap it
        if (!llmResponse.result && llmResponse.sentence && llmResponse.relationship_matrix) {
          llmResponse = { result: { sentence: llmResponse.sentence, relationship_matrix: llmResponse.relationship_matrix } };
        }

        // Unflatten relationship_matrix if needed
        if (llmResponse?.result?.sentence && Array.isArray(llmResponse?.result?.relationship_matrix) && typeof llmResponse.result.relationship_matrix[0] === 'number') {
          const size = Object.keys(llmResponse.result.sentence).length;
          llmResponse = {
            ...llmResponse,
            result: {
              ...llmResponse.result,
              relationship_matrix: unflattenMatrix(llmResponse.result.relationship_matrix, size)
            }
          }
        }
        return {
          ...data,
          id: doc.id,
          llmResponse
        } as CanvasSentence
      })
      console.log("Processed sentences:", sentenceList)
      
      const sortedSentences = sentenceList.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())
      setSentences(sortedSentences)
    } catch (error) {
      console.error("Error fetching sentences:", error)
    }
  }

  const addSentence = async (sentence: string, llmResponse: any) => {
    console.log("Received llmResponse:", JSON.stringify(llmResponse, null, 2))
    
    // Ensure the data structure matches what we expect
    let relationship_matrix = llmResponse.result?.relationship_matrix || llmResponse.relationship_matrix;
    if (Array.isArray(relationship_matrix) && Array.isArray(relationship_matrix[0])) {
      relationship_matrix = flattenMatrix(relationship_matrix);
    }
    const formattedResponse = {
      result: {
        sentence: llmResponse.result?.sentence || llmResponse.sentence,
        relationship_matrix
      }
    }
    console.log("Formatted response:", JSON.stringify(formattedResponse, null, 2))

    const newSentence: CanvasSentence = {
      id: Date.now().toString(), // Use a timestamp as a temporary ID
      userId: user ? user.uid : "anonymous",
      sentence: sentence,
      llmResponse: formattedResponse,
      timestamp: Timestamp.now(),
    }
    console.log("New sentence:", JSON.stringify(newSentence, null, 2))

    setCurrentSentence(newSentence)

    if (user) {
      try {
        const docRef = await addDoc(collection(db, "sentences"), newSentence)
        console.log("Sentence added with ID:", docRef.id)
        fetchSentences(user.uid)
      } catch (error) {
        console.error("Error adding sentence:", error)
        throw error
      }
    }
  }

  const handleDemoSentenceSelect = (sentence: string) => {
    console.log("Handling demo sentence:", sentence)
    
    // Demo data for "Ho visto una bella ragazza"
    const demoResponse = {
      result: {
        sentence: {
          "Ho": {
            position: 0,
            part_of_speech: "verb",
            root: "avere",
            noun_components: { affixes: null },
            noun_case: null,
            noun_case_components: null,
            verb_tense: "present",
            verb_tense_components: ["first person", "singular"]
          },
          "visto": {
            position: 1,
            part_of_speech: "verb",
            root: "vedere",
            noun_components: { affixes: null },
            noun_case: null,
            noun_case_components: null,
            verb_tense: "past participle",
            verb_tense_components: null
          },
          "una": {
            position: 2,
            part_of_speech: "article",
            root: null,
            noun_components: { affixes: null },
            noun_case: null,
            noun_case_components: null,
            verb_tense: null,
            verb_tense_components: null
          },
          "bella": {
            position: 3,
            part_of_speech: "adjective",
            root: "bello",
            noun_components: { affixes: null },
            noun_case: null,
            noun_case_components: null,
            verb_tense: null,
            verb_tense_components: null
          },
          "ragazza": {
            position: 4,
            part_of_speech: "noun",
            root: "ragazza",
            noun_components: { affixes: null },
            noun_case: null,
            noun_case_components: null,
            verb_tense: null,
            verb_tense_components: null
          }
        },
        relationship_matrix: [
          [0, 1, 0, 0, 0],
          [1, 0, 0, 0, 0],
          [0, 0, 0, 1, 0],
          [0, 0, 1, 0, 1],
          [0, 0, 0, 1, 0]
        ]
      }
    }
    console.log("Demo response:", demoResponse)

    const newSentence: CanvasSentence = {
      id: Date.now().toString(),
      userId: user ? user.uid : "anonymous",
      sentence: sentence,
      llmResponse: demoResponse,
      timestamp: Timestamp.now(),
    }
    console.log("New demo sentence:", newSentence)

    setCurrentSentence(newSentence)
  }

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language)
  }

  const selectSentence = (sentence: SidebarSentence) => {
    // Find the original CanvasSentence from our state
    const originalSentence = sentences.find(s => s.id === sentence.id)
    if (originalSentence) {
      setSelectedSentence(originalSentence)
    }
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
  const sidebarSentences = sentences.map(sentence => {
    console.log("Converting sentence for sidebar:", sentence)
    const adapted = adaptSentence(sentence)
    console.log("Adapted sentence:", adapted)
    return adapted
  })

  // Add debug logging before rendering
  console.log("Current state:", {
    selectedSentence,
    currentSentence,
    sentences: sentences.length
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        sentences={sidebarSentences}
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
            {/* Display the sentence text above the canvas visualization */}
            {(selectedSentence || currentSentence) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/80 px-6 py-2 rounded shadow text-xl font-semibold">
                {(selectedSentence?.sentence || currentSentence?.sentence) ?? ''}
              </div>
            )}
            {selectedSentence ? (
              <SentenceCanvas 
                data={selectedSentence.llmResponse} 
                title="Selected Sentence"
                sentence={selectedSentence.sentence}
              />
            ) : currentSentence ? (
              <SentenceCanvas 
                data={currentSentence.llmResponse} 
                title="Analyzed Sentence"
                sentence={currentSentence.sentence}
              />
            ) : null}
          </div>
          {/* Top-left toolbar for sentence controls */}
          <div className="absolute top-4 left-4 z-30 flex gap-2 items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowInput(!showInput)}
              title="New Sentence"
            >
              +
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => handleDemoSentenceSelect('Ho visto una bella ragazza')}
              title="Try Demo"
            >
              <span className="font-bold">D</span>
            </Button>
            <LanguageSelector 
              onLanguageSelect={handleLanguageSelect}
              onDemoSentenceSelect={() => {}}
            />
          </div>
          {/* Collapsible input below toolbar */}
          {showInput && (
            <div className="absolute top-16 left-4 z-30 w-80">
              <SentenceInput onAddSentence={addSentence} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

