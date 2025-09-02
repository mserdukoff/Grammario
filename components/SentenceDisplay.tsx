'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X, Sparkles } from 'lucide-react'
import { LLMResponse, WordInfo } from '@/types'
import GrammarQuiz from './GrammarQuiz'
import VocabularyExpander from './VocabularyExpander'
import ErrorDisplay from './ErrorDisplay'

interface SentenceDisplayProps {
  data: LLMResponse
  title: string
  sentence: string
  onQuizComplete?: (score: number, totalQuestions: number) => void
  onVocabularyExpand?: (word: string) => void
  analysisMetadata?: {
    errors: any[];
    teaching_notes: any[];
    normalized?: string;
    language?: string;
    tokens?: any[];
  }
}

export default function SentenceDisplay({ data, title, sentence, onQuizComplete, onVocabularyExpand, analysisMetadata }: SentenceDisplayProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [vocabularyWord, setVocabularyWord] = useState<{ word: string; wordData: WordInfo } | null>(null)

  const handleWordClick = (word: string) => {
    setSelectedWord(word === selectedWord ? null : word);
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

  const renderWordInfo = (wordData: WordInfo | null | undefined, wordText: string, wordKey: string) => {
    if (!wordData) {
      return <p>No word data available</p>;
    }

    // Find morphological components for this word from analysisMetadata
    const wordTokens = analysisMetadata?.tokens || [];
    const wordToken = wordTokens.find(token => token.text === wordText);
    const morphComponents = wordToken?.morphological_components || [];
    
    // Sort morphological components to show infinitive/root/stem first, then others
    const sortedComponents = [...morphComponents].sort((a, b) => {
      const baseTypes = ['infinitive', 'root', 'stem']
      const aIsBase = baseTypes.includes(a.type)
      const bIsBase = baseTypes.includes(b.type)
      
      if (aIsBase && !bIsBase) return -1
      if (!aIsBase && bIsBase) return 1
      
      // Within base types, prioritize infinitive
      if (aIsBase && bIsBase) {
        if (a.type === 'infinitive' && b.type !== 'infinitive') return -1
        if (a.type !== 'infinitive' && b.type === 'infinitive') return 1
      }
      
      return 0
    })

    const getComponentColor = (type: string) => {
      switch (type.toLowerCase()) {
        case 'root':
        case 'stem':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        case 'infinitive':
          return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-blue-200'
        case 'inflection':
          return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
        case 'prefix':
          return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        case 'suffix':
          return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
        case 'ending':
          return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        default:
          return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      }
    }
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card className="mt-6 max-w-4xl mx-auto border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-4 text-center">"{wordText}"</h3>
            
            {/* Translation Section */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <span className="text-blue-600 dark:text-blue-400">🌐</span>
                English Translation
              </h4>
              
              {wordData.translation ? (
                <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
                  {wordData.translation}
                </p>
              ) : (
                <p className="text-sm text-blue-700 dark:text-blue-300 italic">
                  No translation available
                </p>
                )}
            </div>
            
            {/* Grammar Information Section - Temporarily hidden */}
            {/* 
            <div className="space-y-3 mb-6">
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
            */}

            {/* Morphological Breakdown Section */}
            {morphComponents.length > 0 && (
              <>
                <div className="border-t pt-6 mb-4">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <span className="text-blue-600 dark:text-blue-400">🔍</span>
                    Word Breakdown
                  </h4>
                  
                  {/* Visual breakdown */}
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                    {sortedComponents.map((component, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && (
                          <span className="mx-2 text-gray-400">+</span>
                        )}
                        <Badge 
                          variant="secondary" 
                          className={`${getComponentColor(component.type)} font-mono text-sm px-3 py-1`}
                        >
                          {component.form}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Detailed breakdown */}
                  <div className="space-y-3 mb-4">
                    <h5 className="font-medium text-sm text-gray-600 dark:text-gray-400">Component Details:</h5>
                    {sortedComponents.map((component, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                        <Badge className={getComponentColor(component.type)}>
                          {component.type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-lg">{component.form}</span>
                            {component.function && (
                              <Badge variant="outline" className="text-xs">
                                {component.function}
                              </Badge>
                            )}
                          </div>
                          {component.meaning && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Meaning: {component.meaning}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Assembly demonstration */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>How it's built:</strong>{' '}
                      {sortedComponents.map((comp, i) => (
                        <span key={i}>
                          {i > 0 && ' + '}
                          <span className="font-mono">{comp.form}</span>
                          {comp.meaning && ` (${comp.meaning})`}
                        </span>
                      ))}
                      {' '}= <span className="font-mono font-bold">{wordText}</span>
                    </p>
                  </div>
                </div>
              </>
            )}
            
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
              
              // Check if this word has morphological components
              const wordTokens = analysisMetadata?.tokens || [];
              const wordToken = wordTokens.find(token => token.text === word);
              const hasMorphBreakdown = wordToken?.morphological_components && wordToken.morphological_components.length > 0;
              
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
                  {hasMorphBreakdown && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse" 
                          title="Click to see word breakdown" />
                  )}
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
            renderWordInfo(sentenceData[selectedWord], selectedWord.split('_')[0], selectedWord)
          )}
        </AnimatePresence>

        {/* Grammar Insights */}
        {analysisMetadata && (
          <ErrorDisplay
            errors={analysisMetadata.errors}
            teachingNotes={analysisMetadata.teaching_notes}
            originalSentence={sentence}
            normalizedSentence={analysisMetadata.normalized}
            tokens={analysisMetadata.tokens}
          />
        )}

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

