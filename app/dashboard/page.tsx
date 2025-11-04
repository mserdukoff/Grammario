'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Database, 
  BookOpen, 
  Brain, 
  Calendar, 
  Trophy, 
  Users, 
  Search,
  Filter,
  TrendingUp,
  Clock,
  Award,
  RefreshCw
} from 'lucide-react'
import Header from '@/components/Header'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface Sentence {
  id: string
  userId: string
  userEmail?: string
  sentence: string
  llmResponse: any
  timestamp: Timestamp
}

interface Quiz {
  id: string
  userId: string
  userEmail?: string
  sentenceId?: string
  sentenceText?: string
  questions: any[]
  userAnswers: any
  score: number
  totalQuestions: number
  timestamp: Timestamp
  scoreCategory?: string
}

interface StudySession {
  id: string
  userId: string
  userEmail?: string
  startTime: Timestamp
  endTime?: Timestamp
  sentencesAnalyzed: number
  quizzesCompleted: number
  wordsLearned: string[]
}

interface AchievementUnlock {
  id: string
  userId: string
  userEmail?: string
  achievementId: string
  unlockedAt: Timestamp
}

interface UserProgress {
  id: string
  userId: string
  totalSentences: number
  totalQuizzes: number
  totalQuizScore: number
  currentStreak: number
  longestStreak: number
  vocabularySize: number
  achievementIds: string[]
  languageProgress: any
  createdAt: Timestamp
  updatedAt: Timestamp
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [studySessions, setStudySessions] = useState<StudySession[]>([])
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlock[]>([])
  const [userProgress, setUserProgress] = useState<UserProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [mounted, setMounted] = useState(false)
  const [selectedUserForStats, setSelectedUserForStats] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    // Load data regardless of user status - show all data in dashboard
    if (mounted) {
      loadAllData()
    }
  }, [mounted])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      // First, load all data
      let loadedSentences: Sentence[] = []
      let loadedQuizzes: Quiz[] = []
      let loadedSessions: StudySession[] = []
      let loadedUnlocks: AchievementUnlock[] = []
      let loadedProgress: UserProgress[] = []

      // Load all sentences - try with orderBy first, fallback to simple query
      try {
        const sentencesRef = collection(db, 'sentences')
        // Load ALL sentences without limit
        const sentencesQuery = query(sentencesRef, orderBy('timestamp', 'desc'))
        const sentencesSnapshot = await getDocs(sentencesQuery)
        loadedSentences = sentencesSnapshot.docs.map(doc => {
          const data = doc.data()
          const sentence = {
            id: doc.id,
            ...data
          } as Sentence
          
          // Debug: log userId field to ensure it's being extracted
          if (!sentence.userId) {
            console.warn('Sentence missing userId:', { id: doc.id, dataKeys: Object.keys(data) })
          }
          
          return sentence
        }) as Sentence[]
        // Sort in memory if timestamp exists
        loadedSentences.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0
          return b.timestamp.toMillis() - a.timestamp.toMillis()
        })
        setSentences(loadedSentences)
        console.log('Loaded sentences:', loadedSentences.length)
        // Debug: log all userIds found
        const allUserIds = Array.from(new Set(loadedSentences.map(s => s.userId).filter(Boolean)))
        console.log('All userIds in loaded sentences:', allUserIds)
        console.log('User 5aYF9H7ByogwsxqSsQgsCw0pOFF3 sentences:', loadedSentences.filter(s => s.userId === '5aYF9H7ByogwsxqSsQgsCw0pOFF3').length)
        // Debug: log first sentence to check for email
        if (loadedSentences.length > 0) {
          console.log('First sentence sample:', {
            id: loadedSentences[0].id,
            userId: loadedSentences[0].userId,
            userIdType: typeof loadedSentences[0].userId,
            userEmail: loadedSentences[0].userEmail,
            hasEmail: !!loadedSentences[0].userEmail,
            allKeys: Object.keys(loadedSentences[0])
          })
        }
      } catch (error: any) {
        console.warn('Error loading sentences with orderBy, trying without:', error.message)
        // Fallback: load without orderBy
        const sentencesRef = collection(db, 'sentences')
        const sentencesSnapshot = await getDocs(sentencesRef)
        loadedSentences = sentencesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Sentence[]
        loadedSentences.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0
          return b.timestamp.toMillis() - a.timestamp.toMillis()
        })
        // No limit - load all sentences
        setSentences(loadedSentences)
        console.log('Loaded sentences (fallback):', loadedSentences.length)
      }

      // Load all quizzes - try with orderBy first, fallback to simple query
      try {
        const quizzesRef = collection(db, 'quizzes')
        const quizzesQuery = query(quizzesRef, orderBy('timestamp', 'desc'), limit(1000))
        const quizzesSnapshot = await getDocs(quizzesQuery)
        loadedQuizzes = quizzesSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data
          }
        }) as Quiz[]
        loadedQuizzes.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0
          return b.timestamp.toMillis() - a.timestamp.toMillis()
        })
        setQuizzes(loadedQuizzes)
        console.log('Loaded quizzes:', loadedQuizzes.length)
        // Debug: log first quiz to check for email
        if (loadedQuizzes.length > 0) {
          console.log('First quiz sample:', {
            userId: loadedQuizzes[0].userId,
            userEmail: loadedQuizzes[0].userEmail,
            hasEmail: !!loadedQuizzes[0].userEmail
          })
        }
      } catch (error: any) {
        console.warn('Error loading quizzes with orderBy, trying without:', error.message)
        // Fallback: load without orderBy
        const quizzesRef = collection(db, 'quizzes')
        const quizzesSnapshot = await getDocs(quizzesRef)
        loadedQuizzes = quizzesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Quiz[]
        loadedQuizzes.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0
          return b.timestamp.toMillis() - a.timestamp.toMillis()
        })
        loadedQuizzes = loadedQuizzes.slice(0, 1000)
        setQuizzes(loadedQuizzes)
        console.log('Loaded quizzes (fallback):', loadedQuizzes.length)
      }

      // Load all study sessions - try with orderBy first, fallback to simple query
      try {
        const sessionsRef = collection(db, 'study_sessions')
        const sessionsQuery = query(sessionsRef, orderBy('startTime', 'desc'), limit(1000))
        const sessionsSnapshot = await getDocs(sessionsQuery)
        loadedSessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StudySession[]
        loadedSessions.sort((a, b) => {
          if (!a.startTime || !b.startTime) return 0
          return b.startTime.toMillis() - a.startTime.toMillis()
        })
        setStudySessions(loadedSessions)
        console.log('Loaded study sessions:', loadedSessions.length)
      } catch (error: any) {
        console.warn('Error loading study sessions with orderBy, trying without:', error.message)
        // Fallback: load without orderBy
        const sessionsRef = collection(db, 'study_sessions')
        const sessionsSnapshot = await getDocs(sessionsRef)
        loadedSessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StudySession[]
        loadedSessions.sort((a, b) => {
          if (!a.startTime || !b.startTime) return 0
          return b.startTime.toMillis() - a.startTime.toMillis()
        })
        loadedSessions = loadedSessions.slice(0, 1000)
        setStudySessions(loadedSessions)
        console.log('Loaded study sessions (fallback):', loadedSessions.length)
      }

      // Load all achievement unlocks - try with orderBy first, fallback to simple query
      try {
        const unlocksRef = collection(db, 'achievement_unlocks')
        const unlocksQuery = query(unlocksRef, orderBy('unlockedAt', 'desc'), limit(1000))
        const unlocksSnapshot = await getDocs(unlocksQuery)
        loadedUnlocks = unlocksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AchievementUnlock[]
        loadedUnlocks.sort((a, b) => {
          if (!a.unlockedAt || !b.unlockedAt) return 0
          return b.unlockedAt.toMillis() - a.unlockedAt.toMillis()
        })
        setAchievementUnlocks(loadedUnlocks)
        console.log('Loaded achievement unlocks:', loadedUnlocks.length)
      } catch (error: any) {
        console.warn('Error loading achievement unlocks with orderBy, trying without:', error.message)
        // Fallback: load without orderBy
        const unlocksRef = collection(db, 'achievement_unlocks')
        const unlocksSnapshot = await getDocs(unlocksRef)
        loadedUnlocks = unlocksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AchievementUnlock[]
        loadedUnlocks.sort((a, b) => {
          if (!a.unlockedAt || !b.unlockedAt) return 0
          return b.unlockedAt.toMillis() - a.unlockedAt.toMillis()
        })
        loadedUnlocks = loadedUnlocks.slice(0, 1000)
        setAchievementUnlocks(loadedUnlocks)
        console.log('Loaded achievement unlocks (fallback):', loadedUnlocks.length)
      }

      // Load all user progress
      try {
        const progressRef = collection(db, 'user_progress')
        const progressSnapshot = await getDocs(progressRef)
        loadedProgress = progressSnapshot.docs.map(doc => ({
          id: doc.id,
          userId: doc.id,
          ...doc.data()
        })) as UserProgress[]
        setUserProgress(loadedProgress)
        console.log('Loaded user progress:', loadedProgress.length)
      } catch (error: any) {
        console.error('Error loading user progress:', error)
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique user IDs with their emails
  const userEmailMap = new Map<string, string>()
  
  // Add current logged-in user's email if available
  if (user && user.email) {
    userEmailMap.set(user.uid, user.email)
  }
  
  // Collect emails from all documents (highest priority)
  sentences.forEach(s => {
    if (s.userEmail && s.userId) {
      userEmailMap.set(s.userId, s.userEmail)
    }
  })
  quizzes.forEach(q => {
    if (q.userEmail && q.userId) {
      userEmailMap.set(q.userId, q.userEmail)
    }
  })
  studySessions.forEach(s => {
    if (s.userEmail && s.userId) {
      userEmailMap.set(s.userId, s.userEmail)
    }
  })
  achievementUnlocks.forEach(a => {
    if (a.userEmail && a.userId) {
      userEmailMap.set(a.userId, a.userEmail)
    }
  })
  
  
  const uniqueUserIds = Array.from(new Set([
    ...sentences.map(s => s.userId),
    ...quizzes.map(q => q.userId),
    ...studySessions.map(s => s.userId),
    ...achievementUnlocks.map(a => a.userId),
    ...userProgress.map(u => u.userId)
  ]))
  
  // Helper function to get user display info
  const getUserDisplay = (userId: string) => {
    const email = userEmailMap.get(userId)
    // If no email found and this is the current user, use their email
    const finalEmail = email || (user && userId === user.uid ? user.email : null)
    return {
      email: finalEmail || null,
      display: finalEmail || `${userId.substring(0, 8)}...`,
      fullId: userId
    }
  }

  // Filter data based on search
  const filteredSentences = sentences.filter(s => {
    const userInfo = getUserDisplay(s.userId)
    const matchesSearch = searchQuery === '' || 
      s.sentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (userInfo.email && userInfo.email.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const filteredQuizzes = quizzes.filter(q => {
    const userInfo = getUserDisplay(q.userId)
    const matchesSearch = searchQuery === '' || 
      (q.sentenceText && q.sentenceText.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (userInfo.email && userInfo.email.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  const filteredStudySessions = studySessions

  const filteredAchievementUnlocks = achievementUnlocks.filter(a => {
    const userInfo = getUserDisplay(a.userId)
    const matchesSearch = searchQuery === '' || 
      a.achievementId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (userInfo.email && userInfo.email.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })

  // Calculate stats for each user
  const getUserStats = (userId: string) => {
    // Use strict string comparison and trim to handle any whitespace issues
    const selectedUserId = String(userId || '').trim()
    const userSentences = sentences.filter(s => String(s.userId || '').trim() === selectedUserId)
    const userQuizzes = quizzes.filter(q => String(q.userId || '').trim() === selectedUserId)
    const userSessions = studySessions.filter(s => String(s.userId || '').trim() === selectedUserId)
    const userAchievements = achievementUnlocks.filter(a => String(a.userId || '').trim() === selectedUserId)
    const userProgressData = userProgress.find(u => String(u.userId || '').trim() === selectedUserId)
    
    const avgQuizScore = userQuizzes.length > 0
      ? Math.round(userQuizzes.reduce((sum, q) => sum + q.score, 0) / userQuizzes.length)
      : 0
    
    return {
      sentences: userSentences.length,
      quizzes: userQuizzes.length,
      sessions: userSessions.length,
      achievements: userAchievements.length,
      avgQuizScore,
      progress: userProgressData
    }
  }

  // Calculate statistics
  const totalUsers = uniqueUserIds.length
  const totalSentences = sentences.length
  const totalQuizzes = quizzes.length
  const totalStudySessions = studySessions.length
  const totalAchievements = achievementUnlocks.length
  const averageQuizScore = quizzes.length > 0
    ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length)
    : 0

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate()
    return date.toLocaleString()
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (score >= 80) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Database className="h-8 w-8" />
                Comprehensive Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                View all data from the Grammario database
              </p>
            </div>
            <Button onClick={loadAllData} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} suppressHydrationWarning />
              Refresh
            </Button>
          </div>

          {/* Search Filter */}
          {selectedTab !== 'users' && (
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sentences, quizzes, achievements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <Tabs value={selectedTab} onValueChange={(value) => {
            setSelectedTab(value)
            if (value !== 'users') {
              setSelectedUserForStats(null)
            }
          }}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sentences">Sentences</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalUsers}</div>
                    <p className="text-xs text-muted-foreground">Active users in database</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sentences</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalSentences}</div>
                    <p className="text-xs text-muted-foreground">{filteredSentences.length} after filters</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalQuizzes}</div>
                    <p className="text-xs text-muted-foreground">{filteredQuizzes.length} after filters</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Quiz Score</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{averageQuizScore}%</div>
                    <p className="text-xs text-muted-foreground">Across all quizzes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Study Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalStudySessions}</div>
                    <p className="text-xs text-muted-foreground">{filteredStudySessions.length} after filters</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Achievement Unlocks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalAchievements}</div>
                    <p className="text-xs text-muted-foreground">{filteredAchievementUnlocks.length} after filters</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      User Progress Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userProgress.length}</div>
                    <p className="text-xs text-muted-foreground">Total user progress records</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Sentences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredSentences.slice(0, 5).map(sentence => (
                        <div key={sentence.id} className="border-b pb-3 last:border-0">
                          <p className="text-sm font-medium line-clamp-2">{sentence.sentence}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>User: {getUserDisplay(sentence.userId).display}</span>
                            <span>•</span>
                            <span>{formatDate(sentence.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                      {filteredSentences.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No sentences found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Quizzes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredQuizzes.slice(0, 5).map(quiz => (
                        <div key={quiz.id} className="border-b pb-3 last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={getScoreColor(quiz.score)}>
                              {quiz.score}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(quiz.timestamp)}
                            </span>
                          </div>
                          {quiz.sentenceText && (
                            <p className="text-sm line-clamp-1">{quiz.sentenceText}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            User: {getUserDisplay(quiz.userId).display} • {quiz.totalQuestions} questions
                          </p>
                        </div>
                      ))}
                      {filteredQuizzes.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No quizzes found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sentences" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <CardDescription>
                  Showing {filteredSentences.length} of {totalSentences} sentences
                </CardDescription>
              </div>
              <div className="space-y-4">
                {filteredSentences.map(sentence => (
                  <Card key={sentence.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{sentence.sentence}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1" title={getUserDisplay(sentence.userId).fullId}>
                              <Users className="h-4 w-4" />
                              {getUserDisplay(sentence.userId).display}
                              {getUserDisplay(sentence.userId).email && (
                                <span className="ml-1 text-xs opacity-75">({sentence.userId.substring(0, 6)}...)</span>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDate(sentence.timestamp)}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">ID: {sentence.id.substring(0, 8)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          View LLM Response
                        </summary>
                        <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto max-h-96">
                          {JSON.stringify(sentence.llmResponse, null, 2)}
                        </pre>
                      </details>
                    </CardContent>
                  </Card>
                ))}
                {filteredSentences.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No sentences found matching your filters</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <CardDescription>
                  Showing {filteredQuizzes.length} of {totalQuizzes} quizzes
                </CardDescription>
              </div>
              <div className="space-y-4">
                {filteredQuizzes.map(quiz => (
                  <Card key={quiz.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 flex items-center gap-2">
                            <Badge className={getScoreColor(quiz.score)}>
                              Score: {quiz.score}%
                            </Badge>
                            {quiz.scoreCategory && (
                              <Badge variant="outline">{quiz.scoreCategory}</Badge>
                            )}
                          </CardTitle>
                          {quiz.sentenceText && (
                            <p className="text-sm mb-2">{quiz.sentenceText}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {getUserDisplay(quiz.userId).display}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDate(quiz.timestamp)}
                            </span>
                            <span>{quiz.totalQuestions} questions</span>
                          </div>
                        </div>
                        <Badge variant="outline">ID: {quiz.id.substring(0, 8)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                          View Questions & Answers
                        </summary>
                        <div className="mt-2 space-y-2">
                          <div>
                            <p className="text-sm font-medium mb-1">Questions:</p>
                            <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-64">
                              {JSON.stringify(quiz.questions, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">User Answers:</p>
                            <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-64">
                              {JSON.stringify(quiz.userAnswers, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                ))}
                {filteredQuizzes.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No quizzes found matching your filters</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <CardDescription>
                  Showing {filteredStudySessions.length} of {totalStudySessions} study sessions
                </CardDescription>
              </div>
              <div className="space-y-4">
                {filteredStudySessions.map(session => (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">Study Session</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {getUserDisplay(session.userId).display}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Started: {formatDate(session.startTime)}
                            </span>
                            {session.endTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Ended: {formatDate(session.endTime)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">ID: {session.id.substring(0, 8)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium">Sentences Analyzed</p>
                          <p className="text-2xl font-bold">{session.sentencesAnalyzed}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Quizzes Completed</p>
                          <p className="text-2xl font-bold">{session.quizzesCompleted}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Words Learned</p>
                          <p className="text-2xl font-bold">{session.wordsLearned?.length || 0}</p>
                        </div>
                      </div>
                      {session.wordsLearned && session.wordsLearned.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Words Learned:</p>
                          <div className="flex flex-wrap gap-2">
                            {session.wordsLearned.map((word, idx) => (
                              <Badge key={idx} variant="secondary">{word}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {filteredStudySessions.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No study sessions found matching your filters</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <CardDescription>
                  Showing {filteredAchievementUnlocks.length} of {totalAchievements} achievement unlocks
                </CardDescription>
              </div>
              <div className="space-y-4">
                {filteredAchievementUnlocks.map(unlock => (
                  <Card key={unlock.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            {unlock.achievementId}
                          </CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {getUserDisplay(unlock.userId).display}
                            </span>
                            <span className="flex items-center gap-1">
                              <Award className="h-4 w-4" />
                              Unlocked: {formatDate(unlock.unlockedAt)}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline">ID: {unlock.id.substring(0, 8)}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {filteredAchievementUnlocks.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No achievement unlocks found matching your filters</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-6">
              {selectedUserForStats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Button 
                        variant="ghost" 
                        onClick={() => setSelectedUserForStats(null)}
                        className="mb-4"
                      >
                        ← Back to Users List
                      </Button>
                      <h2 className="text-2xl font-bold">
                        User Stats: {getUserDisplay(selectedUserForStats).display}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        User ID: {selectedUserForStats}
                      </p>
                    </div>
                  </div>
                  
                  {(() => {
                    if (!selectedUserForStats) {
                      return <div>No user selected</div>
                    }
                    
                    // Recalculate stats with the same logic to ensure consistency
                    const stats = getUserStats(selectedUserForStats)
                    const userProgressData = userProgress.find(u => String(u.userId || '').trim() === String(selectedUserForStats || '').trim())
                    
                    // Debug: log what we're looking for
                    console.log('=== User Stats View ===')
                    console.log('selectedUserForStats:', selectedUserForStats)
                    console.log('Stats calculated:', stats)
                    console.log('Total sentences in state:', sentences.length)
                    console.log('Sentences for this user (via getUserStats):', sentences.filter(s => String(s.userId || '').trim() === String(selectedUserForStats || '').trim()).length)
                    
                    return (
                      <div className="space-y-6">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Sentences
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold">{stats.sentences}</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Brain className="h-4 w-4" />
                                Quizzes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold">{stats.quizzes}</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Sessions
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold">{stats.sessions}</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Trophy className="h-4 w-4" />
                                Achievements
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-3xl font-bold">{stats.achievements}</div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Performance Metrics */}
                        {userProgressData && (
                          <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                              <CardHeader>
                                <CardTitle>Progress Stats</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Total Sentences</p>
                                    <p className="text-2xl font-bold">{userProgressData.totalSentences}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Quizzes</p>
                                    <p className="text-2xl font-bold">{userProgressData.totalQuizzes}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Current Streak</p>
                                    <p className="text-2xl font-bold">{userProgressData.currentStreak} days</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Longest Streak</p>
                                    <p className="text-2xl font-bold">{userProgressData.longestStreak} days</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Vocabulary Size</p>
                                    <p className="text-2xl font-bold">{userProgressData.vocabularySize} words</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Avg Quiz Score</p>
                                    <p className="text-2xl font-bold">
                                      {userProgressData.totalQuizzes > 0 
                                        ? Math.round(userProgressData.totalQuizScore / userProgressData.totalQuizzes)
                                        : 0}%
                                    </p>
                                  </div>
                                </div>
                                {userProgressData.achievementIds && userProgressData.achievementIds.length > 0 && (
                                  <div className="mt-4">
                                    <p className="text-sm font-medium mb-2">Achievements:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {userProgressData.achievementIds.map((achievementId, idx) => (
                                        <Badge key={idx} variant="secondary">{achievementId}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {userProgressData.languageProgress && Object.keys(userProgressData.languageProgress).length > 0 && (
                                  <div className="mt-4">
                                    <p className="text-sm font-medium mb-2">Language Progress:</p>
                                    <div className="space-y-2">
                                      {Object.entries(userProgressData.languageProgress).map(([lang, langProgress]: [string, any]) => (
                                        <div key={lang} className="p-2 bg-muted rounded">
                                          <p className="font-medium capitalize">{lang}</p>
                                          <div className="grid grid-cols-3 gap-2 text-sm mt-1">
                                            <span>{langProgress.sentencesAnalyzed || 0} sentences</span>
                                            <span>{langProgress.wordsLearned || 0} words</span>
                                            <span>{langProgress.averageQuizScore || 0}% avg</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Recent Activity - Always show regardless of userProgressData */}
                        <div className="mt-6">
                          <Card>
                          <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Showing last 10 items</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                                <div>
                                  <p className="text-sm font-medium mb-2">Recent Sentences ({Math.min(10, stats.sentences)}):</p>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {(() => {
                                      if (!selectedUserForStats) {
                                        return <p className="text-sm text-muted-foreground">No user selected</p>
                                      }
                                      
                                      // Use the EXACT same filter logic as getUserStats
                                      const selectedUserId = String(selectedUserForStats || '').trim()
                                      const userSentences = sentences
                                        .filter(s => String(s.userId || '').trim() === selectedUserId)
                                        .sort((a, b) => {
                                          if (!a.timestamp || !b.timestamp) return 0
                                          return b.timestamp.toMillis() - a.timestamp.toMillis()
                                        })
                                        .slice(0, 10)
                                      
                                      // Debug if mismatch
                                      if (stats.sentences > 0 && userSentences.length === 0) {
                                        console.error('=== SENTENCE FILTER MISMATCH ===')
                                        console.error('Selected userId:', selectedUserId)
                                        console.error('Stats shows:', stats.sentences, 'sentences')
                                        console.error('Filtered found:', userSentences.length, 'sentences')
                                        console.error('All sentences count:', sentences.length)
                                        
                                        // Check all sentences for this user
                                        const matchingSentences = sentences.filter(s => String(s.userId || '').trim() === selectedUserId)
                                        console.error('Matching sentences found:', matchingSentences.length)
                                        console.error('Matching sentences:', matchingSentences.map(s => ({
                                          id: s.id,
                                          userId: s.userId,
                                          sentence: s.sentence?.substring(0, 50) || 'No sentence'
                                        })))
                                      }
                                      
                                      // Always log what we found
                                      console.log('Displaying sentences for user:', selectedUserId)
                                      console.log('Found sentences:', userSentences.length)
                                      console.log('Stats says:', stats.sentences)
                                      
                                      if (userSentences.length === 0 && stats.sentences > 0) {
                                        return (
                                          <div>
                                            <p className="text-sm text-muted-foreground mb-2">No sentences found (expected {stats.sentences})</p>
                                            <p className="text-xs text-muted-foreground">Check console for debug info</p>
                                            <p className="text-xs text-muted-foreground">Selected: {selectedUserId}</p>
                                            <p className="text-xs text-muted-foreground">Total sentences in state: {sentences.length}</p>
                                          </div>
                                        )
                                      }
                                      
                                      if (userSentences.length === 0) {
                                        return <p className="text-sm text-muted-foreground">No sentences yet</p>
                                      }
                                      
                                      console.log('Rendering', userSentences.length, 'sentences')
                                      return userSentences.map(sentence => {
                                        console.log('Rendering sentence:', sentence.id, sentence.userId)
                                        return (
                                          <div key={sentence.id} className="p-2 bg-muted rounded text-sm">
                                            <p className="line-clamp-2">{sentence.sentence}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {formatDate(sentence.timestamp)}
                                            </p>
                                          </div>
                                        )
                                      })
                                    })()}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-2">Recent Quizzes ({Math.min(10, stats.quizzes)}):</p>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {(() => {
                                      if (!selectedUserForStats) {
                                        return <p className="text-sm text-muted-foreground">No user selected</p>
                                      }
                                      
                                      // Use strict string comparison and trim to handle any whitespace issues
                                      const selectedUserId = String(selectedUserForStats || '').trim()
                                      const userQuizzes = quizzes
                                        .filter(q => String(q.userId || '').trim() === selectedUserId)
                                        .sort((a, b) => {
                                          if (!a.timestamp || !b.timestamp) return 0
                                          return b.timestamp.toMillis() - a.timestamp.toMillis()
                                        })
                                        .slice(0, 10)
                                      
                                      if (userQuizzes.length === 0 && stats.quizzes > 0) {
                                        return (
                                          <div>
                                            <p className="text-sm text-muted-foreground mb-2">No quizzes found (expected {stats.quizzes})</p>
                                            <p className="text-xs text-muted-foreground">Check console for debug info</p>
                                          </div>
                                        )
                                      }
                                      
                                      if (userQuizzes.length === 0) {
                                        return <p className="text-sm text-muted-foreground">No quizzes yet</p>
                                      }
                                      
                                      return userQuizzes.map(quiz => (
                                        <div key={quiz.id} className="p-2 bg-muted rounded text-sm">
                                          <div className="flex items-center justify-between">
                                            <Badge className={getScoreColor(quiz.score)}>
                                              {quiz.score}%
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              {formatDate(quiz.timestamp)}
                                            </span>
                                          </div>
                                          {quiz.sentenceText && (
                                            <p className="line-clamp-1 mt-1">{quiz.sentenceText}</p>
                                          )}
                                        </div>
                                      ))
                                    })()}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                        </div>

                        {!userProgressData && (
                          <Card>
                            <CardContent className="py-8 text-center">
                              <p className="text-muted-foreground">No progress data available for this user</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <CardDescription>
                      Select a user to view their recent stats
                    </CardDescription>
                    <div className="text-sm text-muted-foreground">
                      {uniqueUserIds.length} total users
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {uniqueUserIds.map(userId => {
                      const userInfo = getUserDisplay(userId)
                      const stats = getUserStats(userId)
                      return (
                        <Card 
                          key={userId} 
                          className="cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => setSelectedUserForStats(userId)}
                        >
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              {userInfo.display}
                            </CardTitle>
                            <CardDescription className="text-xs font-mono">
                              {userId.substring(0, 12)}...
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Sentences</p>
                                <p className="text-xl font-bold">{stats.sentences}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Quizzes</p>
                                <p className="text-xl font-bold">{stats.quizzes}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Sessions</p>
                                <p className="text-xl font-bold">{stats.sessions}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Avg Score</p>
                                <p className="text-xl font-bold">{stats.avgQuizScore}%</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                    
                    {uniqueUserIds.length === 0 && (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">No users found</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}

