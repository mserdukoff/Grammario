'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ExternalLink, RefreshCw, Sparkles } from 'lucide-react'
import { WordInfo } from '@/types'

interface RelatedWord {
  word: string
  relation: 'synonym' | 'antonym' | 'related' | 'derivative'
  definition?: string
  example?: string
}

interface VocabularyData {
  word: string
  definition: string
  synonyms: string[]
  antonyms: string[]
  related: string[]
  derivatives: string[]
  examples: string[]
  frequency?: 'common' | 'uncommon' | 'rare'
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

interface VocabularyExpanderProps {
  word: string
  wordData: WordInfo
  language: string
  onClose: () => void
}

export default function VocabularyExpander({ word, wordData, language, onClose }: VocabularyExpanderProps) {
  const [vocabularyData, setVocabularyData] = useState<VocabularyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'related' | 'examples'>('overview')

  useEffect(() => {
    fetchVocabularyData()
  }, [word, language])

  const fetchVocabularyData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/vocabulary-expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          word, 
          language, 
          partOfSpeech: wordData.part_of_speech,
          root: wordData.root 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch vocabulary data')
      }

      const data = await response.json()
      setVocabularyData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching vocabulary data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getRelationColor = (relation: string) => {
    switch (relation) {
      case 'synonym': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'antonym': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'related': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'derivative': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'common': return 'bg-green-100 text-green-800'
      case 'uncommon': return 'bg-yellow-100 text-yellow-800'
      case 'rare': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Vocabulary Expansion: "{word}"
              </CardTitle>
              <Button variant="outline" size="icon" onClick={onClose}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-18" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Vocabulary Expansion</CardTitle>
              <Button variant="outline" size="icon" onClick={onClose}>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchVocabularyData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (!vocabularyData) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Vocabulary Expansion: "{word}"
            </CardTitle>
            <Button variant="outline" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4">
            {(['overview', 'related', 'examples'] as const).map((tab) => (
              <Button
                key={tab}
                variant={selectedTab === tab ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Word Info */}
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold">{word}</h3>
                    <div className="flex gap-2">
                      {vocabularyData.difficulty && (
                        <Badge className={getDifficultyColor(vocabularyData.difficulty)}>
                          {vocabularyData.difficulty}
                        </Badge>
                      )}
                      {vocabularyData.frequency && (
                        <Badge className={getFrequencyColor(vocabularyData.frequency)}>
                          {vocabularyData.frequency}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{vocabularyData.definition}</p>
                </div>

                {/* Grammar Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Grammar Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Part of Speech:</span>
                        <Badge variant="outline">{wordData.part_of_speech}</Badge>
                      </div>
                      {wordData.root && wordData.root !== word && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Root:</span>
                          <span className="text-sm font-medium">{wordData.root}</span>
                        </div>
                      )}
                      {wordData.gender && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Gender:</span>
                          <span className="text-sm font-medium">{wordData.gender}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Quick Examples</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {vocabularyData.examples.slice(0, 2).map((example, index) => (
                        <div key={index} className="mb-2 last:mb-0">
                          <p className="text-sm italic">"{example}"</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {selectedTab === 'related' && (
              <motion.div
                key="related"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Synonyms */}
                {vocabularyData.synonyms.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                      Synonyms
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {vocabularyData.synonyms.map((synonym, index) => (
                        <Badge key={index} className={getRelationColor('synonym')}>
                          {synonym}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Antonyms */}
                {vocabularyData.antonyms.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      Antonyms
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {vocabularyData.antonyms.map((antonym, index) => (
                        <Badge key={index} className={getRelationColor('antonym')}>
                          {antonym}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Words */}
                {vocabularyData.related.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                      Related Words
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {vocabularyData.related.map((relatedWord, index) => (
                        <Badge key={index} className={getRelationColor('related')}>
                          {relatedWord}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Derivatives */}
                {vocabularyData.derivatives.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                      Word Family
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {vocabularyData.derivatives.map((derivative, index) => (
                        <Badge key={index} className={getRelationColor('derivative')}>
                          {derivative}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {selectedTab === 'examples' && (
              <motion.div
                key="examples"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold">Example Sentences</h3>
                {vocabularyData.examples.map((example, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <p className="text-base italic mb-2">"{example}"</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span>Example {index + 1}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}



