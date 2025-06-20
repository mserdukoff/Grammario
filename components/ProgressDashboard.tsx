"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Target, BookOpen, TrendingUp, Calendar, Award } from "lucide-react"
import { QuizResult, UserProgress } from "@/types"

interface ProgressDashboardProps {
  quizResults: QuizResult[]
  totalSentences: number
  userProgress?: UserProgress
}

export default function ProgressDashboard({ quizResults, totalSentences, userProgress }: ProgressDashboardProps) {
  const totalQuizzes = quizResults.length
  const averageScore = totalQuizzes > 0 
    ? Math.round(quizResults.reduce((sum, result) => sum + result.score, 0) / totalQuizzes)
    : 0
  
  const recentQuizzes = quizResults.slice(0, 5)
  const bestScore = totalQuizzes > 0 ? Math.max(...quizResults.map(r => r.score)) : 0
  
  const getBadgeForScore = (score: number) => {
    if (score >= 90) return { name: "Grammar Master", icon: "🏆", color: "text-yellow-600" }
    if (score >= 80) return { name: "Excellent", icon: "⭐", color: "text-blue-600" }
    if (score >= 70) return { name: "Good Job", icon: "👍", color: "text-green-600" }
    if (score >= 60) return { name: "Keep Going", icon: "📚", color: "text-orange-600" }
    return { name: "Practice More", icon: "💪", color: "text-red-600" }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Progress
          </CardTitle>
          <CardDescription>
            Track your grammar learning journey
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalSentences}</div>
            <p className="text-sm text-muted-foreground">Sentences Analyzed</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalQuizzes}</div>
            <p className="text-sm text-muted-foreground">Quizzes Taken</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{averageScore}%</div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentQuizzes.length > 0 ? (
            <div className="space-y-3">
              {recentQuizzes.map((result, index) => {
                const badge = getBadgeForScore(result.score)
                return (
                  <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{badge.icon}</div>
                      <div>
                        <p className="font-medium">Quiz #{totalQuizzes - index}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.totalQuestions} questions • {new Date(result.timestamp.toMillis()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{result.score}%</div>
                      <Badge variant="secondary" className={badge.color}>
                        {badge.name}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quizzes taken yet. Start your first quiz!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalQuizzes > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-2">🏆</div>
                <div className="font-bold">Best Score</div>
                <div className="text-2xl text-green-600">{bestScore}%</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-2">📊</div>
                <div className="font-bold">Consistency</div>
                <div className="text-2xl text-blue-600">
                  {Math.round((quizResults.filter(r => r.score >= 70).length / totalQuizzes) * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 