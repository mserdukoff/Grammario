"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, ArrowRight, Trophy, Target } from "lucide-react"
import { QuizQuestion, QuizResult, Sentence } from "@/types"
import { Timestamp } from "firebase/firestore"

interface QuizGeneratorProps {
  sentence: Sentence
  onQuizComplete: (result: QuizResult) => void
  onClose: () => void
}

const PART_OF_SPEECH_OPTIONS = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'article'
]

const CASE_OPTIONS = [
  'nominative', 'accusative', 'dative', 'genitive', 'vocative', 'ablative', 'locative'
]

const TENSE_OPTIONS = [
  'present', 'past', 'future', 'imperfect', 'perfect', 'pluperfect', 'future perfect'
]

export default function QuizGenerator({ sentence, onQuizComplete, onClose }: QuizGeneratorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string }>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    generateQuestions()
  }, [sentence])

  const generateQuestions = () => {
    const newQuestions: QuizQuestion[] = []
    const sentenceData = sentence.llmResponse.result?.sentence || sentence.llmResponse.sentence || {}
    
    Object.entries(sentenceData).forEach(([wordKey, wordInfo]) => {
      const word = wordKey.split('_')[0] // Extract word from key like "word_0"
      const position = parseInt(wordKey.split('_')[1]) || 0
      
      // Generate part of speech question
      if (wordInfo.part_of_speech) {
        const options = [...PART_OF_SPEECH_OPTIONS]
        if (!options.includes(wordInfo.part_of_speech)) {
          options[0] = wordInfo.part_of_speech
        }
        // Shuffle and take first 4
        const shuffledOptions = options.sort(() => Math.random() - 0.5).slice(0, 4)
        if (!shuffledOptions.includes(wordInfo.part_of_speech)) {
          shuffledOptions[0] = wordInfo.part_of_speech
        }
        
        newQuestions.push({
          id: `pos_${wordKey}`,
          type: 'part_of_speech',
          question: `What part of speech is "${word}" in this sentence?`,
          correctAnswer: wordInfo.part_of_speech,
          options: shuffledOptions.sort(() => Math.random() - 0.5),
          word,
          position
        })
      }

      // Generate root word question
      if (wordInfo.root && wordInfo.root !== word) {
        const options = [wordInfo.root, word, word + 'ing', word + 'ed']
        newQuestions.push({
          id: `root_${wordKey}`,
          type: 'root_word',
          question: `What is the root word of "${word}"?`,
          correctAnswer: wordInfo.root,
          options: options.sort(() => Math.random() - 0.5),
          word,
          position
        })
      }

      // Generate case question for nouns
      if (wordInfo.noun_case) {
        const options = [...CASE_OPTIONS]
        if (!options.includes(wordInfo.noun_case)) {
          options[0] = wordInfo.noun_case
        }
        const shuffledOptions = options.sort(() => Math.random() - 0.5).slice(0, 4)
        if (!shuffledOptions.includes(wordInfo.noun_case)) {
          shuffledOptions[0] = wordInfo.noun_case
        }
        
        newQuestions.push({
          id: `case_${wordKey}`,
          type: 'case',
          question: `What case is the noun "${word}" in?`,
          correctAnswer: wordInfo.noun_case,
          options: shuffledOptions.sort(() => Math.random() - 0.5),
          word,
          position
        })
      }

      // Generate tense question for verbs
      if (wordInfo.verb_tense) {
        const options = [...TENSE_OPTIONS]
        if (!options.includes(wordInfo.verb_tense)) {
          options[0] = wordInfo.verb_tense
        }
        const shuffledOptions = options.sort(() => Math.random() - 0.5).slice(0, 4)
        if (!shuffledOptions.includes(wordInfo.verb_tense)) {
          shuffledOptions[0] = wordInfo.verb_tense
        }
        
        newQuestions.push({
          id: `tense_${wordKey}`,
          type: 'tense',
          question: `What tense is the verb "${word}" in?`,
          correctAnswer: wordInfo.verb_tense,
          options: shuffledOptions.sort(() => Math.random() - 0.5),
          word,
          position
        })
      }
    })

    // Shuffle questions and limit to 5-8 questions
    const shuffledQuestions = newQuestions.sort(() => Math.random() - 0.5).slice(0, Math.min(8, newQuestions.length))
    setQuestions(shuffledQuestions)
  }

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      calculateResults()
    }
  }

  const calculateResults = () => {
    let correctAnswers = 0
    questions.forEach(question => {
      if (userAnswers[question.id] === question.correctAnswer) {
        correctAnswers++
      }
    })
    
    const finalScore = Math.round((correctAnswers / questions.length) * 100)
    setScore(finalScore)
    setShowResults(true)
  }

  const handleComplete = () => {
    const result: QuizResult = {
      id: Date.now().toString(),
      userId: sentence.userId,
      sentenceId: sentence.id,
      questions,
      userAnswers,
      score,
      totalQuestions: questions.length,
      timestamp: Timestamp.now()
    }
    onQuizComplete(result)
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  if (questions.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Grammar Quiz
          </CardTitle>
          <CardDescription>
            Generating quiz questions...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (showResults) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Quiz Results
          </CardTitle>
          <CardDescription>
            You scored {score}% on this grammar quiz!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{score}%</div>
            <Progress value={score} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {score >= 80 ? "Excellent! You're mastering grammar!" :
               score >= 60 ? "Good job! Keep practicing!" :
               "Keep studying! You'll get better with practice!"}
            </p>
          </div>
          
          <div className="space-y-2">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[question.id]
              const isCorrect = userAnswer === question.correctAnswer
              
              return (
                <div key={question.id} className="flex items-start gap-2 p-2 rounded border">
                  {isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{question.question}</p>
                    <p className="text-xs text-muted-foreground">
                      Your answer: <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                        {userAnswer || "No answer"}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="text-xs text-green-600">
                        Correct: {question.correctAnswer}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Close
            </Button>
            <Button onClick={handleComplete} className="flex-1">
              Save Results
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Grammar Quiz
        </CardTitle>
        <CardDescription>
          Question {currentQuestionIndex + 1} of {questions.length}
        </CardDescription>
        <Progress value={progress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-lg font-medium">
          {currentQuestion.question}
        </div>
        
        <div className="space-y-2">
          {currentQuestion.options.map((option) => (
            <Button
              key={option}
              variant={userAnswers[currentQuestion.id] === option ? "default" : "outline"}
              className="w-full justify-start h-auto p-3"
              onClick={() => handleAnswerSelect(currentQuestion.id, option)}
            >
              {option}
            </Button>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-4">
          <Badge variant="secondary">
            Word: {currentQuestion.word}
          </Badge>
          <Button 
            onClick={handleNext}
            disabled={!userAnswers[currentQuestion.id]}
            className="flex items-center gap-2"
          >
            {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 