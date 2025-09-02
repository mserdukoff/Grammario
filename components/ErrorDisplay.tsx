'use client'

import { motion } from 'framer-motion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Lightbulb, BookOpen } from 'lucide-react'
import { type Analysis } from '@/lib/grammario'

// Extract types from the Analysis schema for use in props
type ErrorItem = NonNullable<Analysis['errors']>[number]
type TeachingNote = NonNullable<Analysis['teaching_notes']>[number]

interface ErrorDisplayProps {
  errors: ErrorItem[]
  teachingNotes: TeachingNote[]
  originalSentence: string
  normalizedSentence?: string
  tokens?: any[] // Keep for backward compatibility but not used for morphology display
}

export default function ErrorDisplay({ 
  errors, 
  teachingNotes, 
  originalSentence, 
  normalizedSentence,
  tokens 
}: ErrorDisplayProps) {
  const hasErrors = errors.length > 0
  const hasCorrections = normalizedSentence && normalizedSentence !== originalSentence

  if (!hasErrors && !hasCorrections && teachingNotes.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto mt-6 space-y-4"
    >
      {/* Corrections */}
      {hasCorrections && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">
            Suggested Correction
          </AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            <div className="mt-2 space-y-2">
              <div>
                <span className="font-medium">Original: </span>
                <span className="italic">{originalSentence}</span>
              </div>
              <div>
                <span className="font-medium">Corrected: </span>
                <span className="italic font-medium text-green-700 dark:text-green-300">
                  {normalizedSentence}
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {hasErrors && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              Grammar Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.map((error, index) => (
              <div key={index} className="border-l-4 border-red-400 pl-4 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge variant="destructive" className="text-xs mb-2">
                      {error.type}
                    </Badge>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {error.explanation || error.fix}
                    </p>
                    {error.fix && error.explanation && (
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Fix: {error.fix}
                      </p>
                    )}
                    {error.rule && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Rule: {error.rule}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Teaching Notes */}
      {teachingNotes.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <BookOpen className="h-5 w-5" />
              Grammar Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {teachingNotes.map((note, index) => (
              <div key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        {note.topic}
                      </h4>
                      {note.level && (
                        <Badge variant="secondary" className="text-xs">
                          {note.level}
                        </Badge>
                      )}
                    </div>
                    {note.example_pairs && note.example_pairs.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                          Examples:
                        </p>
                        {note.example_pairs.map((pair, pairIndex) => (
                          <div key={pairIndex} className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="italic">{pair.example}</span>
                            {pair.translation && (
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
                                → {pair.translation}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
