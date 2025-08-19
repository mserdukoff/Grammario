"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, ExternalLink, Star, TrendingUp } from "lucide-react"
import { WordInfo } from "@/types"

interface VocabularyExpansionProps {
  word: string
  wordInfo: WordInfo
  onAddToVocabulary?: (word: string, data: any) => void
}

// Mock vocabulary data - in a real app, this would come from an API
const getVocabularyData = (word: string, partOfSpeech: string) => {
  const mockData = {
    synonyms: [
      word + "_syn1",
      word + "_syn2", 
      word + "_syn3"
    ],
    relatedWords: [
      word + "_related1",
      word + "_related2",
      word + "_related3"
    ],
    frequency: "common" as const,
    exampleSentences: [
      `Example sentence using "${word}" in context.`,
      `Another example showing "${word}" usage.`
    ]
  }
  
  return mockData
}

export default function VocabularyExpansion({ word, wordInfo, onAddToVocabulary }: VocabularyExpansionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const vocabularyData = getVocabularyData(word, wordInfo.part_of_speech)

  const handleAddToVocabulary = () => {
    if (onAddToVocabulary) {
      onAddToVocabulary(word, {
        ...vocabularyData,
        partOfSpeech: wordInfo.part_of_speech,
        root: wordInfo.root
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{word}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{wordInfo.part_of_speech}</Badge>
              {wordInfo.root && wordInfo.root !== word && (
                <Badge variant="outline">Root: {wordInfo.root}</Badge>
              )}
              {wordInfo.noun_case && (
                <Badge variant="outline">{wordInfo.noun_case} case</Badge>
              )}
              {wordInfo.verb_tense && (
                <Badge variant="outline">{wordInfo.verb_tense} tense</Badge>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "−" : "+"}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Synonyms */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Synonyms
            </h4>
            <div className="flex flex-wrap gap-2">
              {vocabularyData.synonyms.map((synonym, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer hover:bg-accent">
                  {synonym}
                </Badge>
              ))}
            </div>
          </div>

          {/* Related Words */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Related Words
            </h4>
            <div className="flex flex-wrap gap-2">
              {vocabularyData.relatedWords.map((relatedWord, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer hover:bg-accent">
                  {relatedWord}
                </Badge>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Frequency
            </h4>
            <Badge 
              variant={vocabularyData.frequency === "common" ? "default" : "secondary"}
              className="capitalize"
            >
              {vocabularyData.frequency}
            </Badge>
          </div>

          {/* Example Sentences */}
          <div>
            <h4 className="font-medium mb-2">Example Sentences</h4>
            <div className="space-y-2">
              {vocabularyData.exampleSentences.map((sentence, index) => (
                <p key={index} className="text-sm text-muted-foreground italic">
                  "{sentence}"
                </p>
              ))}
            </div>
          </div>

          {/* Add to Vocabulary Button */}
          {onAddToVocabulary && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddToVocabulary}
              className="w-full"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Add to Vocabulary List
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
} 