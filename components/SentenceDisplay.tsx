'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { LLMResponse, WordInfo } from '@/types'

interface SentenceDisplayProps {
  data: LLMResponse
}

export default function SentenceDisplay({ data }: SentenceDisplayProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)

  const handleWordClick = (word: string) => {
    setSelectedWord(word === selectedWord ? null : word)
  }

  const getRelatedWords = (word: string) => {
    const sentence = data.result?.sentence || data.sentence;
    const matrix = data.result?.relationship_matrix || data.relationship_matrix;
    
    if (!sentence || !matrix) return [];
    
    const index = Object.keys(sentence).indexOf(word)
    const words = Object.keys(sentence)

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

  const renderWordInfo = (wordData: WordInfo | null | undefined) => {
    if (!wordData) {
      return <p>No word data available</p>;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="mt-4">
          <CardContent className="p-4">
            {Object.entries(wordData).map(([key, value]) => {
              if (value !== null && key !== 'position') {
                const formattedKey = key
                  .split('_')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
                if (typeof value === 'object' && value !== null) {
                  return (
                    <div key={key}>
                      <p className="font-semibold">{formattedKey}:</p>
                      {Object.entries(value).map(([subKey, subValue]) => (
                        <p key={subKey} className="ml-4">
                          <span className="font-medium">{subKey}:</span>{' '}
                          {typeof subValue === 'string' || typeof subValue === 'number' ? String(subValue) : JSON.stringify(subValue)}
                        </p>
                      ))}
                    </div>
                  )
                }
                return (
                  <p key={key} className="mb-2">
                    <span className="font-semibold">{formattedKey}:</span>{' '}
                    {Array.isArray(value) ? value.join(', ') : value}
                  </p>
                )
              }
              return null
            })}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Guard against missing or malformed data
  const sentence = data.result?.sentence || data.sentence;
  if (!sentence || Object.keys(sentence).length === 0) {
    return null;
  }
  
  const sortedWords = Object.entries(sentence).sort((a, b) => a[1].position - b[1].position)

  return (
    <div>
      <div className="mb-4">
        {sortedWords.map(([wordKey, wordData]) => {
          // Extract the word from the key (remove position suffix)
          const word = wordKey.split('_')[0];
          const isRelated = hoveredWord && getRelatedWords(hoveredWord).includes(wordKey)
          return (
            <motion.span
              key={wordKey}
              className={`inline-block mr-2 mb-2 p-2 rounded cursor-pointer transition-colors duration-200 ${
                isRelated ? 'bg-yellow-200 dark:bg-yellow-800' : 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700'
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
      <AnimatePresence>
        {selectedWord && sentence[selectedWord] && renderWordInfo(sentence[selectedWord])}
      </AnimatePresence>
    </div>
  )
}

