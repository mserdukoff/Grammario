'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, RefreshCw, Trophy } from 'lucide-react'
import { LLMResponse, WordInfo } from '@/types'

interface QuizQuestion {
  id: string
  type: 'part_of_speech' | 'root' | 'gender' | 'tense' | 'case'
  question: string
  word: string
  correctAnswer: string
  options: string[]
  explanation: string
}

interface GrammarQuizProps {
  sentenceData: LLMResponse
  sentence: string
  onQuizComplete?: (score: number, totalQuestions: number) => void
}

export default function GrammarQuiz({ sentenceData, sentence, onQuizComplete }: GrammarQuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())

  useEffect(() => {
    generateQuestions()
  }, [sentenceData])

  const generateQuestions = () => {
    const sentenceWords = sentenceData.result?.sentence || sentenceData.sentence;
    if (!sentenceWords) return;

    const generatedQuestions: QuizQuestion[] = []
    const words = Object.entries(sentenceWords)

    // Generate different types of questions
    words.forEach(([wordKey, wordData], index) => {
      const word = wordKey.split('_')[0]
      
      // Part of speech question
      if (wordData.part_of_speech) {
        const otherPOS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'article', 'conjunction']
          .filter(pos => pos !== wordData.part_of_speech)
          .slice(0, 3)
        
        generatedQuestions.push({
          id: `pos_${index}`,
          type: 'part_of_speech',
          question: `What is the part of speech of "${word}"?`,
          word,
          correctAnswer: wordData.part_of_speech,
          options: shuffleArray([wordData.part_of_speech, ...otherPOS]),
          explanation: `"${word}" is a ${wordData.part_of_speech}.`
        })
      }

      // Root/lemma question
      if (wordData.root && wordData.root !== word) {
        const otherRoots = words
          .filter(([, data]) => data.root && data.root !== wordData.root)
          .map(([, data]) => data.root!)
          .slice(0, 3)
        
        if (otherRoots.length >= 2) {
          generatedQuestions.push({
            id: `root_${index}`,
            type: 'root',
            question: `What is the root/lemma of "${word}"?`,
            word,
            correctAnswer: wordData.root,
            options: shuffleArray([wordData.root, ...otherRoots]),
            explanation: `The root form of "${word}" is "${wordData.root}".`
          })
        }
      }

      // Gender question
      if (wordData.gender) {
        const genders = ['masculine', 'feminine', 'neuter'].filter(g => g !== wordData.gender)
        generatedQuestions.push({
          id: `gender_${index}`,
          type: 'gender',
          question: `What is the gender of "${word}"?`,
          word,
          correctAnswer: wordData.gender,
          options: shuffleArray([wordData.gender, ...genders]),
          explanation: `"${word}" is ${wordData.gender}.`
        })
      }

      // Tense question
      if (wordData.verb_tense) {
        const tenses = ['present', 'past', 'future', 'present perfect', 'past perfect', 'conditional']
          .filter(t => t !== wordData.verb_tense)
          .slice(0, 3)
        
        generatedQuestions.push({
          id: `tense_${index}`,
          type: 'tense',
          question: `What tense is "${word}"?`,
          word,
          correctAnswer: wordData.verb_tense,
          options: shuffleArray([wordData.verb_tense, ...tenses]),
          explanation: `"${word}" is in the ${wordData.verb_tense} tense.`
        })
      }

      // Case question
      if (wordData.noun_case) {
        const cases = ['nominative', 'accusative', 'dative', 'genitive', 'instrumental', 'ablative']
          .filter(c => c !== wordData.noun_case)
          .slice(0, 3)
        
        generatedQuestions.push({
          id: `case_${index}`,
          type: 'case',
          question: `What case is "${word}" in?`,
          word,
          correctAnswer: wordData.noun_case,
          options: shuffleArray([wordData.noun_case, ...cases]),
          explanation: `"${word}" is in the ${wordData.noun_case} case.`
        })
      }
    })

    // Limit to 5 questions and shuffle
    setQuestions(shuffleArray(generatedQuestions).slice(0, 5))
  }

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const handleAnswerSelect = (answer: string) => {
    if (showAnswer) return
    setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return
    
    setShowAnswer(true)
    setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]))
    
    if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setShowAnswer(false)
    } else {
      setQuizCompleted(true)
      onQuizComplete?.(score + (selectedAnswer === questions[currentQuestionIndex].correctAnswer ? 1 : 0), questions.length)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowAnswer(false)
    setScore(0)
    setQuizCompleted(false)
    setAnsweredQuestions(new Set())
    generateQuestions()
  }

  if (questions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Not enough data available to generate quiz questions for this sentence.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (quizCompleted) {
    const finalScore = score + (selectedAnswer === questions[currentQuestionIndex]?.correctAnswer ? 1 : 0)
    const percentage = Math.round((finalScore / questions.length) * 100)
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto"
      >
        <Card>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            </motion.div>
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-4xl font-bold text-primary">
              {finalScore}/{questions.length}
            </div>
            <div className="text-xl text-muted-foreground">
              {percentage}% Correct
            </div>
            <Progress value={percentage} className="w-full max-w-xs mx-auto" />
            <div className="pt-4">
              <Button onClick={restartQuiz} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <Badge variant="outline">
              Score: {score}/{answeredQuestions.size}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>

      {/* Current Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQuestion.question}
              </CardTitle>
              <div className="text-center p-4 bg-muted rounded-lg">
                <span className="text-2xl font-medium">
                  "{sentence}"
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {currentQuestion.options.map((option, index) => {
                  let buttonVariant: "default" | "outline" | "destructive" | "secondary" = "outline"
                  let icon = null

                  if (showAnswer) {
                    if (option === currentQuestion.correctAnswer) {
                      buttonVariant = "default"
                      icon = <CheckCircle className="h-4 w-4" />
                    } else if (option === selectedAnswer && option !== currentQuestion.correctAnswer) {
                      buttonVariant = "destructive"
                      icon = <XCircle className="h-4 w-4" />
                    }
                  } else if (selectedAnswer === option) {
                    buttonVariant = "secondary"
                  }

                  return (
                    <Button
                      key={index}
                      variant={buttonVariant}
                      className="justify-between h-auto p-4 text-left"
                      onClick={() => handleAnswerSelect(option)}
                      disabled={showAnswer}
                    >
                      <span>{option}</span>
                      {icon}
                    </Button>
                  )
                })}
              </div>

              {showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentQuestion.explanation}
                  </p>
                </motion.div>
              )}

              <div className="flex gap-2 pt-4">
                {!showAnswer ? (
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="w-full"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button onClick={handleNextQuestion} className="w-full">
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
