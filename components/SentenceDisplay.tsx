'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X, Sparkles } from 'lucide-react'
import { LLMResponse, WordInfo } from '@/types'
import GrammarQuiz from './GrammarQuiz'
import VocabularyExpander from './VocabularyExpander'

interface SentenceDisplayProps {
  data: LLMResponse
  title: string
  sentence: string
  onQuizComplete?: (score: number, totalQuestions: number) => void
  onVocabularyExpand?: (word: string) => void
}

export default function SentenceDisplay({ data, title, sentence, onQuizComplete, onVocabularyExpand }: SentenceDisplayProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [vocabularyWord, setVocabularyWord] = useState<{ word: string; wordData: WordInfo } | null>(null)

  const handleWordClick = (word: string) => {
    setSelectedWord(word === selectedWord ? null : word)
  }

  // Function to detect RTL languages
  const isRTLLanguage = (text: string) => {
    // RTL Unicode ranges: Arabic, Hebrew, Persian, Urdu, etc.
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return rtlRegex.test(text);
  }

  // Determine text direction based on the sentence content
  const isRTL = isRTLLanguage(sentence);
  const textDirection = isRTL ? 'rtl' : 'ltr';

  const getRelatedWords = (word: string) => {
    const sentenceData = data.result?.sentence || data.sentence;
    const matrix = data.result?.relationship_matrix || data.relationship_matrix;
    
    if (!sentenceData || !matrix) return [];
    
    const index = Object.keys(sentenceData).indexOf(word)
    const words = Object.keys(sentenceData)

    if (Array.isArray(matrix)) {
      if (matrix.length === 0) {
        return [];
      }
      if (Array.isArray(matrix[0])) {
        // Nested array format
        const row = matrix[index];
        if (Array.isArray(row)) {
          return row
            .map((relation, i) => relation === 1 ? words[i] : null)
            .filter((w): w is string => w !== null);
        }
      } else {
        // Single array format
        const matrixSize = words.length
        return words.filter((_, i) => {
          const value = (matrix as number[])[index * matrixSize + i]
          return typeof value === 'number' && value === 1 && i !== index
        })
      }
    } else if (typeof matrix === 'object') {
      // Object format
      return Object.entries(matrix)
        .filter(([key, value]) => value === 1 && key !== word)
        .map(([key]) => key)
    }
    
    console.warn('Unexpected relationship_matrix format:', matrix)
    return []
  }

  const renderWordInfo = (wordData: WordInfo | null | undefined, wordText: string) => {
    if (!wordData) {
      return <p>No word data available</p>;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card className="mt-6 max-w-2xl mx-auto">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 text-center">"{wordText}"</h3>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Part of Speech:</span>
                <span className="text-base">{wordData.part_of_speech}</span>
              </div>
              
              {wordData.root && wordData.root !== wordText && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Root:</span>
                  <span className="text-base">{wordData.root}</span>
                </div>
              )}
              
              {wordData.gender && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Gender:</span>
                  <span className="text-base">{wordData.gender}</span>
                </div>
              )}
              
              {wordData.noun_case && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Case:</span>
                  <span className="text-base">{wordData.noun_case}</span>
                </div>
              )}
              
              {wordData.noun_case_components && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Case Components:</span>
                  <span className="text-base">{wordData.noun_case_components}</span>
                </div>
              )}
              
              {wordData.verb_tense && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Tense:</span>
                  <span className="text-base">{wordData.verb_tense}</span>
                </div>
              )}
              
              {wordData.verb_tense_components && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Tense Components:</span>
                  <span className="text-base">
                    {Array.isArray(wordData.verb_tense_components) 
                      ? wordData.verb_tense_components.join(', ')
                      : wordData.verb_tense_components}
                  </span>
                </div>
              )}
              
              {wordData.noun_components?.affixes && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-sm text-gray-600 dark:text-gray-400">Affixes:</span>
                  <span className="text-base">{wordData.noun_components.affixes}</span>
                </div>
              )}
            </div>
            
            {/* Vocabulary Expansion Button */}
            <div className="pt-4 border-t">
              <Button 
                onClick={() => {
                  setVocabularyWord({ word: wordText, wordData })
                  onVocabularyExpand?.(wordText)
                }}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Expand Vocabulary
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Guard against missing or malformed data
  const sentenceData = data.result?.sentence || data.sentence;
  if (!sentenceData || Object.keys(sentenceData).length === 0) {
    return null;
  }
  
  const sortedWords = Object.entries(sentenceData).sort((a, b) => a[1].position - b[1].position)

  if (showQuiz) {
    return (
      <div className="w-full min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 pt-8">
            <h2 className="text-2xl font-bold">Grammar Quiz</h2>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowQuiz(false)}
              title="Back to Analysis"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <GrammarQuiz 
            sentenceData={data} 
            sentence={sentence}
            onQuizComplete={(score, total) => {
              onQuizComplete?.(score, total)
              setShowQuiz(false)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Main Sentence Display */}
        <div className="text-center mb-8 pt-8">
          <div 
            className="inline-flex flex-wrap justify-center items-center gap-3 text-4xl font-medium leading-relaxed"
            dir={textDirection}
            style={{ direction: textDirection }}
          >
            {sortedWords.map(([wordKey, wordData], index) => {
              // Extract the word from the key (remove position suffix)
              const word = wordKey.split('_')[0];
              const isSelected = selectedWord === wordKey;
              const isRelated = hoveredWord && getRelatedWords(hoveredWord).includes(wordKey);
              
              return (
                <motion.span
                  key={wordKey}
                  className={`relative cursor-pointer px-4 py-3 rounded-lg transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : isRelated 
                        ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100' 
                        : 'hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-900 dark:hover:text-blue-100'
                  }`}
                  onClick={() => handleWordClick(wordKey)}
                  onMouseEnter={() => setHoveredWord(wordKey)}
                  onMouseLeave={() => setHoveredWord(null)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {word}
                </motion.span>
              )
            })}
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <Button 
              onClick={() => setShowQuiz(true)}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Start Grammar Quiz
            </Button>
          </div>
        </div>

        {/* Word Information Display */}
        <AnimatePresence>
          {selectedWord && sentenceData[selectedWord] && (
            renderWordInfo(sentenceData[selectedWord], selectedWord.split('_')[0])
          )}
        </AnimatePresence>

      </div>
      
      {/* Vocabulary Expander Modal */}
      <AnimatePresence>
        {vocabularyWord && (
          <VocabularyExpander
            word={vocabularyWord.word}
            wordData={vocabularyWord.wordData}
            language="italian" // This should be dynamic based on selected language
            onClose={() => setVocabularyWord(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

