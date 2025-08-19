'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, 
  Target, 
  Calendar, 
  BookOpen, 
  Brain, 
  Sparkles,
  TrendingUp,
  Clock,
  Award,
  Star,
  Flame
} from 'lucide-react'
import { UserProgress, Achievement, StudySession } from '@/types/progress'
import { ProgressTracker } from '@/lib/progress-tracker'
import { ACHIEVEMENTS } from '@/lib/achievements'

interface ProgressDashboardProps {
  userId: string
  onClose: () => void
}

interface AchievementCardProps {
  achievement: Achievement
  isUnlocked: boolean
  progress?: number
}

function AchievementCard({ achievement, isUnlocked, progress = 0 }: AchievementCardProps) {
  const categoryColors = {
    grammar: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    quiz: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    vocabulary: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    streak: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    milestone: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className={`relative overflow-hidden ${isUnlocked ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="text-2xl">{achievement.icon}</div>
            {isUnlocked && (
              <div className="text-yellow-500">
                <Trophy className="h-5 w-5" />
              </div>
            )}
          </div>
          
          <h3 className={`font-semibold mb-1 ${isUnlocked ? 'text-yellow-800 dark:text-yellow-200' : ''}`}>
            {achievement.title}
          </h3>
          
          <p className={`text-sm mb-3 ${isUnlocked ? 'text-yellow-700 dark:text-yellow-300' : 'text-muted-foreground'}`}>
            {achievement.description}
          </p>
          
          <div className="flex items-center justify-between">
            <Badge className={categoryColors[achievement.category]}>
              {achievement.category}
            </Badge>
            
            {!isUnlocked && progress > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Progress value={(progress / achievement.requirement) * 100} className="w-16 h-2" />
                <span className="text-xs text-muted-foreground">
                  {progress}/{achievement.requirement}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function ProgressDashboard({ userId, onClose }: ProgressDashboardProps) {
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('overview')

  useEffect(() => {
    loadProgressData()
  }, [userId])

  const loadProgressData = async () => {
    setIsLoading(true)
    try {
      const tracker = new ProgressTracker(userId)
      const [progress, unlockedAchievements, sessions] = await Promise.all([
        tracker.getProgress(),
        tracker.getUnlockedAchievements(),
        tracker.getRecentSessions(5)
      ])
      
      setUserProgress(progress)
      setAchievements(unlockedAchievements)
      setRecentSessions(sessions)
    } catch (error) {
      console.error('Error loading progress data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh]">
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading your progress...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userProgress) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 text-center">
            <p>Unable to load progress data.</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalStudyTime = Object.values(userProgress.languageProgress || {})
    .reduce((sum, lang) => sum + (lang.timeSpent || 0), 0)

  const averageQuizScore = userProgress.totalQuizzes > 0 
    ? Math.round(userProgress.totalQuizScore / userProgress.totalQuizzes)
    : 0

  const getProgressForAchievement = (achievement: Achievement): number => {
    switch (achievement.category) {
      case 'grammar':
        return userProgress.totalSentences
      case 'quiz':
        if (achievement.id === 'quiz_beginner' || achievement.id === 'quiz_enthusiast') {
          return userProgress.totalQuizzes
        }
        return 0
      case 'vocabulary':
        if (achievement.id === 'word_collector' || achievement.id === 'vocabulary_builder') {
          return userProgress.vocabularySize
        } else if (achievement.id === 'polyglot_beginner') {
          return Object.keys(userProgress.languageProgress || {}).length
        }
        return 0
      case 'streak':
        return userProgress.currentStreak
      case 'milestone':
        if (achievement.id === 'time_invested' || achievement.id === 'scholar_hours') {
          return totalStudyTime
        }
        return 0
      default:
        return 0
    }
  }

  const unlockedAchievements = ACHIEVEMENTS.filter(a => 
    userProgress.achievementIds?.includes(a.id)
  )
  
  const availableAchievements = ACHIEVEMENTS.filter(a => 
    !userProgress.achievementIds?.includes(a.id)
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Your Learning Progress
            </CardTitle>
            <Button variant="outline" size="icon" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="languages">Languages</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{userProgress.totalSentences}</div>
                    <div className="text-sm text-muted-foreground">Sentences</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">{userProgress.totalQuizzes}</div>
                    <div className="text-sm text-muted-foreground">Quizzes</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold">{userProgress.vocabularySize}</div>
                    <div className="text-sm text-muted-foreground">Words</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">{userProgress.currentStreak}</div>
                    <div className="text-sm text-muted-foreground">Day Streak</div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average Quiz Score</span>
                        <span>{averageQuizScore}%</span>
                      </div>
                      <Progress value={averageQuizScore} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Longest Streak</span>
                        <span>{userProgress.longestStreak} days</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Total Study Time</span>
                        <span>{Math.round(totalStudyTime / 60)}h {totalStudyTime % 60}m</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Recent Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {unlockedAchievements.slice(-3).map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 py-2">
                        <span className="text-xl">{achievement.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{achievement.title}</div>
                          <div className="text-xs text-muted-foreground">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                    {unlockedAchievements.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No achievements unlocked yet. Keep studying to earn your first achievement!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </h2>
                <Progress 
                  value={(unlockedAchievements.length / ACHIEVEMENTS.length) * 100} 
                  className="w-32" 
                />
              </div>

              {/* Unlocked Achievements */}
              {unlockedAchievements.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Unlocked ({unlockedAchievements.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unlockedAchievements.map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        isUnlocked={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Available Achievements */}
              {availableAchievements.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-gray-500" />
                    Available ({availableAchievements.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableAchievements.map((achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        isUnlocked={false}
                        progress={getProgressForAchievement(achievement)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="languages" className="space-y-6">
              <h2 className="text-xl font-semibold">Language Progress</h2>
              
              {Object.entries(userProgress.languageProgress || {}).length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Start analyzing sentences to see your language progress here!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(userProgress.languageProgress).map(([language, progress]) => (
                    <Card key={language}>
                      <CardHeader>
                        <CardTitle className="text-lg capitalize">{language}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold">{progress.sentencesAnalyzed}</div>
                            <div className="text-sm text-muted-foreground">Sentences</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{progress.wordsLearned}</div>
                            <div className="text-sm text-muted-foreground">Words</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Average Quiz Score</span>
                            <span>{progress.averageQuizScore}%</span>
                          </div>
                          <Progress value={progress.averageQuizScore} />
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 inline mr-1" />
                          {Math.round(progress.timeSpent / 60)}h {progress.timeSpent % 60}m studied
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
