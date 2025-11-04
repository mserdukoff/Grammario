'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Database, 
  AlertTriangle, 
  Users, 
  FileText, 
  Trophy, 
  Clock,
  ArrowLeft,
  RefreshCw,
  Activity,
  TrendingUp,
  BookOpen,
  Search,
  User as UserIcon
} from 'lucide-react'
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

interface ErrorLog {
  id: string;
  timestamp: Timestamp;
  errorType: string;
  errorMessage: string;
  errorDetails?: any;
  stackTrace?: string;
  endpoint?: string;
  requestData?: any;
  fullLLMResponse?: string;
  httpStatus?: number;
  userId?: string;
  userAgent?: string;
}

interface CollectionStats {
  name: string;
  count: number;
  latest?: Timestamp;
}

interface UserData {
  id: string;
  userId: string;
  totalSentences?: number;
  totalQuizzes?: number;
  totalQuizScore?: number;
  currentStreak?: number;
  longestStreak?: number;
  vocabularySize?: number;
  achievementIds?: string[];
  languageProgress?: any;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface UserDetail {
  user: UserData;
  sentences: any[];
  quizzes: any[];
  studySessions: any[];
  achievements: any[];
}

interface AdminLog {
  id: string;
  timestamp?: Timestamp;
  createdAt?: Timestamp;
  endpoint?: string;
  method?: string;
  userId?: string;
  userAgent?: string;
  requestData?: any;
  responseData?: any;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

export default function AdminDashboard() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [collectionStats, setCollectionStats] = useState<CollectionStats[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [recentSentences, setRecentSentences] = useState<any[]>([])
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<UserData[]>([])
  const [recentErrors, setRecentErrors] = useState<ErrorLog[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadCollectionStats(),
        loadErrorLogs(),
        loadRecentActivity(),
        loadAdminLogs()
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadAdminLogs = async () => {
    try {
      const q = query(
        collection(db, 'admin_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      )
      const snapshot = await getDocs(q)
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminLog[]
      setAdminLogs(logs)
    } catch (error) {
      // If admin_logs doesn't have timestamp field, try createdAt
      try {
        const q = query(
          collection(db, 'admin_logs'),
          orderBy('createdAt', 'desc'),
          limit(100)
        )
        const snapshot = await getDocs(q)
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdminLog[]
        setAdminLogs(logs)
      } catch (fallbackError) {
        // If ordering fails, just get all logs
        try {
          const snapshot = await getDocs(collection(db, 'admin_logs'))
          const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as AdminLog[]
          // Sort manually by timestamp or createdAt
          logs.sort((a, b) => {
            const aTime = a.timestamp?.toMillis() || a.createdAt?.toMillis() || 0
            const bTime = b.timestamp?.toMillis() || b.createdAt?.toMillis() || 0
            return bTime - aTime
          })
          setAdminLogs(logs.slice(0, 100))
        } catch (finalError) {
          console.error('Error loading admin logs:', finalError)
        }
      }
    }
  }

  const loadCollectionStats = async () => {
    try {
      const collections = [
        'sentences',
        'quizzes',
        'user_progress',
        'study_sessions',
        'achievement_unlocks',
        'error_logs',
        'admin_logs'
      ]

      const statsPromises = collections.map(async (collectionName) => {
        const snapshot = await getDocs(collection(db, collectionName))
        const docs = snapshot.docs
        const latest = docs.length > 0 
          ? docs.sort((a, b) => {
              const aTime = a.data().timestamp?.toMillis() || a.data().createdAt?.toMillis() || 0
              const bTime = b.data().timestamp?.toMillis() || b.data().createdAt?.toMillis() || 0
              return bTime - aTime
            })[0]?.data().timestamp || docs[0]?.data().createdAt
          : undefined

        return {
          name: collectionName,
          count: docs.length,
          latest: latest
        }
      })

      const stats = await Promise.all(statsPromises)
      setCollectionStats(stats)
    } catch (error) {
      console.error('Error loading collection stats:', error)
    }
  }

  const loadErrorLogs = async () => {
    try {
      const q = query(
        collection(db, 'error_logs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      )
      const snapshot = await getDocs(q)
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ErrorLog[]
      setErrorLogs(logs)
      setRecentErrors(logs.slice(0, 10))
    } catch (error) {
      console.error('Error loading error logs:', error)
    }
  }

  const loadRecentActivity = async () => {
    try {
      // Load recent sentences
      const sentencesQuery = query(
        collection(db, 'sentences'),
        orderBy('timestamp', 'desc'),
        limit(10)
      )
      const sentencesSnapshot = await getDocs(sentencesQuery)
      setRecentSentences(sentencesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })))

      // Load recent quizzes
      const quizzesQuery = query(
        collection(db, 'quizzes'),
        orderBy('timestamp', 'desc'),
        limit(10)
      )
      const quizzesSnapshot = await getDocs(quizzesQuery)
      setRecentQuizzes(quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })))

      // Load all users - get unique user IDs from all collections
      await loadAllUsers()
    } catch (error) {
      console.error('Error loading recent activity:', error)
    }
  }

  const loadAllUsers = async () => {
    try {
      const userIds = new Set<string>()
      const userDataMap = new Map<string, UserData>()

      // Get users from user_progress
      try {
        const usersQuery = query(
          collection(db, 'user_progress')
        )
        const usersSnapshot = await getDocs(usersQuery)
        usersSnapshot.docs.forEach(doc => {
          const data = doc.data() as UserData
          const userId = data.userId
          if (userId) {
            userIds.add(userId)
            userDataMap.set(userId, {
              id: doc.id,
              ...data
            })
          }
        })
      } catch (error) {
        console.error('Error loading user_progress:', error)
      }

      // Get unique user IDs from sentences
      try {
        const sentencesSnapshot = await getDocs(collection(db, 'sentences'))
        sentencesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const userId = data.userId
          if (userId) {
            userIds.add(userId)
            // If user doesn't have progress record, create a basic one
            if (!userDataMap.has(userId)) {
              userDataMap.set(userId, {
                id: userId,
                userId: userId,
                totalSentences: 0,
                totalQuizzes: 0,
                totalQuizScore: 0,
                currentStreak: 0,
                longestStreak: 0,
                vocabularySize: 0,
                achievementIds: [],
                languageProgress: {},
              })
            }
          }
        })
      } catch (error) {
        console.error('Error loading sentences:', error)
      }

      // Get unique user IDs from quizzes
      try {
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'))
        quizzesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const userId = data.userId
          if (userId) {
            userIds.add(userId)
            if (!userDataMap.has(userId)) {
              userDataMap.set(userId, {
                id: userId,
                userId: userId,
                totalSentences: 0,
                totalQuizzes: 0,
                totalQuizScore: 0,
                currentStreak: 0,
                longestStreak: 0,
                vocabularySize: 0,
                achievementIds: [],
                languageProgress: {},
              })
            }
          }
        })
      } catch (error) {
        console.error('Error loading quizzes:', error)
      }

      // Get unique user IDs from study_sessions
      try {
        const sessionsSnapshot = await getDocs(collection(db, 'study_sessions'))
        sessionsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const userId = data.userId
          if (userId) {
            userIds.add(userId)
            if (!userDataMap.has(userId)) {
              userDataMap.set(userId, {
                id: userId,
                userId: userId,
                totalSentences: 0,
                totalQuizzes: 0,
                totalQuizScore: 0,
                currentStreak: 0,
                longestStreak: 0,
                vocabularySize: 0,
                achievementIds: [],
                languageProgress: {},
              })
            }
          }
        })
      } catch (error) {
        console.error('Error loading study_sessions:', error)
      }

      // Get unique user IDs from achievement_unlocks
      try {
        const achievementsSnapshot = await getDocs(collection(db, 'achievement_unlocks'))
        achievementsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const userId = data.userId
          if (userId) {
            userIds.add(userId)
            if (!userDataMap.has(userId)) {
              userDataMap.set(userId, {
                id: userId,
                userId: userId,
                totalSentences: 0,
                totalQuizzes: 0,
                totalQuizScore: 0,
                currentStreak: 0,
                longestStreak: 0,
                vocabularySize: 0,
                achievementIds: [],
                languageProgress: {},
              })
            }
          }
        })
      } catch (error) {
        console.error('Error loading achievement_unlocks:', error)
      }

      // Now calculate actual counts for each user
      const usersWithData = Array.from(userDataMap.values())
      
      // Calculate sentence counts
      try {
        const sentencesSnapshot = await getDocs(collection(db, 'sentences'))
        sentencesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const userId = data.userId
          if (userId && userDataMap.has(userId)) {
            const user = userDataMap.get(userId)!
            user.totalSentences = (user.totalSentences || 0) + 1
          }
        })
      } catch (error) {
        console.error('Error counting sentences:', error)
      }

      // Calculate quiz counts and scores
      try {
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'))
        quizzesSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const userId = data.userId
          if (userId && userDataMap.has(userId)) {
            const user = userDataMap.get(userId)!
            user.totalQuizzes = (user.totalQuizzes || 0) + 1
            user.totalQuizScore = (user.totalQuizScore || 0) + (data.score || 0)
          }
        })
      } catch (error) {
        console.error('Error counting quizzes:', error)
      }

      // Sort by updatedAt if available (descending), otherwise by userId
      usersWithData.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis() || 0
        const bTime = b.updatedAt?.toMillis() || 0
        if (aTime !== bTime) return bTime - aTime // Descending order
        return (a.userId || '').localeCompare(b.userId || '')
      })

      setAllUsers(usersWithData)
    } catch (error) {
      console.error('Error loading all users:', error)
    }
  }

  const loadUserDetail = async (userId: string) => {
    try {
      // Load user progress
      let userData: UserData | undefined
      try {
        const userProgressQuery = query(
          collection(db, 'user_progress'),
          where('userId', '==', userId)
        )
        const userProgressSnapshot = await getDocs(userProgressQuery)
        userData = userProgressSnapshot.docs[0]?.data() as UserData | undefined
      } catch (error) {
        console.error('Error loading user progress:', error)
      }

      // If no progress record, create a basic one
      if (!userData) {
        userData = {
          id: userId,
          userId: userId,
          totalSentences: 0,
          totalQuizzes: 0,
          totalQuizScore: 0,
          currentStreak: 0,
          longestStreak: 0,
          vocabularySize: 0,
          achievementIds: [],
          languageProgress: {},
        }
      }

      // Load user's sentences
      let sentences: any[] = []
      try {
        const sentencesQuery = query(
          collection(db, 'sentences'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        )
        const sentencesSnapshot = await getDocs(sentencesQuery)
        sentences = sentencesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        // If orderBy fails, try without it
        try {
          const sentencesQuery = query(
            collection(db, 'sentences'),
            where('userId', '==', userId)
          )
          const sentencesSnapshot = await getDocs(sentencesQuery)
          sentences = sentencesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          // Sort manually (descending - newest first)
          sentences.sort((a, b) => {
            const aTime = a.timestamp?.toMillis() || 0
            const bTime = b.timestamp?.toMillis() || 0
            return bTime - aTime // Descending order
          })
        } catch (fallbackError) {
          console.error('Error loading sentences:', fallbackError)
        }
      }
      
      // Update user data with actual counts
      userData.totalSentences = sentences.length

      // Load user's quizzes
      let quizzes: any[] = []
      try {
        const quizzesQuery = query(
          collection(db, 'quizzes'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        )
        const quizzesSnapshot = await getDocs(quizzesQuery)
        quizzes = quizzesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        // If orderBy fails, try without it
        try {
          const quizzesQuery = query(
            collection(db, 'quizzes'),
            where('userId', '==', userId)
          )
          const quizzesSnapshot = await getDocs(quizzesQuery)
          quizzes = quizzesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          // Sort manually
          quizzes.sort((a, b) => {
            const aTime = a.timestamp?.toMillis() || 0
            const bTime = b.timestamp?.toMillis() || 0
            return bTime - aTime
          })
        } catch (fallbackError) {
          console.error('Error loading quizzes:', fallbackError)
        }
      }
      
      // Update user data with actual counts
      userData.totalQuizzes = quizzes.length
      userData.totalQuizScore = quizzes.reduce((sum, quiz) => sum + (quiz.score || 0), 0)

      // Load user's study sessions
      let sessions: any[] = []
      try {
        const sessionsQuery = query(
          collection(db, 'study_sessions'),
          where('userId', '==', userId),
          orderBy('startTime', 'desc')
        )
        const sessionsSnapshot = await getDocs(sessionsQuery)
        sessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        // If orderBy fails, try without it
        try {
          const sessionsQuery = query(
            collection(db, 'study_sessions'),
            where('userId', '==', userId)
          )
          const sessionsSnapshot = await getDocs(sessionsQuery)
          sessions = sessionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          // Sort manually
          sessions.sort((a, b) => {
            const aTime = a.startTime?.toMillis() || 0
            const bTime = b.startTime?.toMillis() || 0
            return bTime - aTime
          })
        } catch (fallbackError) {
          console.error('Error loading study sessions:', fallbackError)
        }
      }

      // Load user's achievements
      let achievements: any[] = []
      try {
        const achievementsQuery = query(
          collection(db, 'achievement_unlocks'),
          where('userId', '==', userId),
          orderBy('unlockedAt', 'desc')
        )
        const achievementsSnapshot = await getDocs(achievementsQuery)
        achievements = achievementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        // If orderBy fails, try without it
        try {
          const achievementsQuery = query(
            collection(db, 'achievement_unlocks'),
            where('userId', '==', userId)
          )
          const achievementsSnapshot = await getDocs(achievementsQuery)
          achievements = achievementsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          // Sort manually
          achievements.sort((a, b) => {
            const aTime = a.unlockedAt?.toMillis() || 0
            const bTime = b.unlockedAt?.toMillis() || 0
            return bTime - aTime
          })
        } catch (fallbackError) {
          console.error('Error loading achievements:', fallbackError)
        }
      }
      
      // Update user data with actual counts
      userData.achievementIds = achievements.map(a => a.achievementId).filter(Boolean)

      setUserDetail({
        user: userData,
        sentences,
        quizzes,
        studySessions: sessions,
        achievements
      })
    } catch (error) {
      console.error('Error loading user detail:', error)
    }
  }

  useEffect(() => {
    if (selectedUserId) {
      loadUserDetail(selectedUserId)
    }
  }, [selectedUserId])

  const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate()
    return date.toLocaleString()
  }

  const getErrorSeverity = (error: ErrorLog) => {
    if (error.httpStatus && error.httpStatus >= 500) return 'destructive'
    if (error.httpStatus && error.httpStatus >= 400) return 'default'
    return 'secondary'
  }

  const filteredUsers = allUsers.filter(user => 
    user.userId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (selectedUserId && userDetail) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedUserId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserIcon className="h-6 w-6" />
              User Details: {selectedUserId}
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sentences</p>
                  <p className="text-2xl font-bold">{userDetail.user.totalSentences || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                  <p className="text-2xl font-bold">{userDetail.user.totalQuizzes || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quiz Score</p>
                  <p className="text-2xl font-bold">{userDetail.user.totalQuizScore || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold">{userDetail.user.currentStreak || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                  <p className="text-2xl font-bold">{userDetail.user.longestStreak || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vocabulary Size</p>
                  <p className="text-2xl font-bold">{userDetail.user.vocabularySize || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Achievements</p>
                  <p className="text-2xl font-bold">{userDetail.user.achievementIds?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Active</p>
                  <p className="text-sm font-medium">{formatTimestamp(userDetail.user.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sentences ({userDetail.sentences.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userDetail.sentences.map((sentence) => (
                  <div key={sentence.id} className="border-b pb-2">
                    <p className="font-medium">{sentence.sentence}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(sentence.timestamp)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quizzes ({userDetail.quizzes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userDetail.quizzes.map((quiz) => (
                  <div key={quiz.id} className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Score: {quiz.score} / {quiz.totalQuestions}</p>
                      <Badge variant={quiz.score >= 80 ? "default" : quiz.score >= 60 ? "secondary" : "destructive"}>
                        {quiz.scoreCategory}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(quiz.timestamp)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Study Sessions ({userDetail.studySessions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userDetail.studySessions.map((session) => (
                  <div key={session.id} className="border-b pb-2">
                    <p className="font-medium">Duration: {session.durationMinutes || 0} minutes</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(session.startTime)} - {formatTimestamp(session.endTime)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Achievements ({userDetail.achievements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userDetail.achievements.map((achievement) => (
                  <div key={achievement.id} className="border-b pb-2">
                    <p className="font-medium">{achievement.achievementId}</p>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(achievement.unlockedAt)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Admin Dashboard
          </h1>
          <Button variant="outline" size="icon" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Recent Calls</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="sentences">Sentences</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collectionStats.map((stat) => (
                  <Card key={stat.name}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {stat.name === 'sentences' && <FileText className="h-4 w-4" />}
                        {stat.name === 'quizzes' && <BookOpen className="h-4 w-4" />}
                        {stat.name === 'user_progress' && <Users className="h-4 w-4" />}
                        {stat.name === 'study_sessions' && <Clock className="h-4 w-4" />}
                        {stat.name === 'achievement_unlocks' && <Trophy className="h-4 w-4" />}
                        {stat.name === 'error_logs' && <AlertTriangle className="h-4 w-4" />}
                        {stat.name === 'admin_logs' && <Activity className="h-4 w-4" />}
                        {stat.name.replace('_', ' ').toUpperCase()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stat.count}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Latest: {formatTimestamp(stat.latest)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Recent API Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {adminLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent calls logged</p>
                    ) : (
                      adminLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {log.method && (
                                  <Badge variant="outline" className="text-xs">{log.method}</Badge>
                                )}
                                {log.endpoint && (
                                  <span className="text-sm font-medium">{log.endpoint}</span>
                                )}
                                {log.statusCode && (
                                  <Badge variant={log.statusCode >= 400 ? "destructive" : "default"} className="text-xs">
                                    {log.statusCode}
                                  </Badge>
                                )}
                              </div>
                              {log.userId && (
                                <p className="text-xs text-muted-foreground">User: {log.userId}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTimestamp(log.timestamp || log.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Recent Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentErrors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No errors logged</p>
                    ) : (
                      recentErrors.slice(0, 5).map((error) => (
                        <div key={error.id} className="border-l-4 border-red-500 pl-4 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Badge variant={getErrorSeverity(error)} className="mb-1">
                                {error.errorType}
                              </Badge>
                              <p className="text-sm font-medium">{error.errorMessage}</p>
                              {error.endpoint && (
                                <p className="text-xs text-muted-foreground">Endpoint: {error.endpoint}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTimestamp(error.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4 mt-4">
              <div className="space-y-4">
                {adminLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No admin logs found</p>
                ) : (
                  adminLogs.map((log) => (
                    <Card key={log.id} className="border-l-4 border-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {log.method && (
                                <Badge variant="outline">{log.method}</Badge>
                              )}
                              {log.endpoint && (
                                <Badge variant="outline">{log.endpoint}</Badge>
                              )}
                              {log.statusCode && (
                                <Badge variant={log.statusCode >= 400 ? "destructive" : log.statusCode >= 300 ? "secondary" : "default"}>
                                  {log.statusCode}
                                </Badge>
                              )}
                              {log.duration && (
                                <Badge variant="outline">{log.duration}ms</Badge>
                              )}
                            </div>
                            {log.userId && (
                              <p className="text-sm text-muted-foreground mb-1">User ID: {log.userId}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(log.timestamp || log.createdAt)}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {log.requestData && (
                          <div>
                            <p className="text-sm font-medium mb-2">Request Data:</p>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-48">
                              {typeof log.requestData === 'string' 
                                ? log.requestData 
                                : JSON.stringify(log.requestData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.responseData && (
                          <div>
                            <p className="text-sm font-medium mb-2">Response Data:</p>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-48">
                              {typeof log.responseData === 'string' 
                                ? log.responseData 
                                : JSON.stringify(log.responseData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.userAgent && (
                          <p className="text-xs text-muted-foreground">User Agent: {log.userAgent}</p>
                        )}
                        {/* Show any other fields that might exist */}
                        {Object.keys(log).filter(key => 
                          !['id', 'timestamp', 'createdAt', 'endpoint', 'method', 'userId', 'userAgent', 'requestData', 'responseData', 'statusCode', 'duration'].includes(key)
                        ).length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Additional Data:</p>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                              {JSON.stringify(
                                Object.fromEntries(
                                  Object.entries(log).filter(([key]) => 
                                    !['id', 'timestamp', 'createdAt', 'endpoint', 'method', 'userId', 'userAgent', 'requestData', 'responseData', 'statusCode', 'duration'].includes(key)
                                  )
                                ),
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="errors" className="space-y-4 mt-4">
              <div className="space-y-4">
                {errorLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No errors logged</p>
                ) : (
                  errorLogs.map((error) => (
                    <Card key={error.id} className="border-l-4 border-red-500">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={getErrorSeverity(error)}>
                                {error.errorType}
                              </Badge>
                              {error.httpStatus && (
                                <Badge variant="outline">HTTP {error.httpStatus}</Badge>
                              )}
                              {error.endpoint && (
                                <Badge variant="outline">{error.endpoint}</Badge>
                              )}
                            </div>
                            <CardTitle className="text-base">{error.errorMessage}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimestamp(error.timestamp)}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {error.errorDetails && (
                          <div>
                            <p className="text-sm font-medium mb-2">Error Details:</p>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                              {JSON.stringify(error.errorDetails, null, 2)}
                            </pre>
                          </div>
                        )}
                        {error.stackTrace && (
                          <div>
                            <p className="text-sm font-medium mb-2">Stack Trace:</p>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                              {error.stackTrace}
                            </pre>
                          </div>
                        )}
                        {error.requestData && (
                          <div>
                            <p className="text-sm font-medium mb-2">Request Data:</p>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                              {JSON.stringify(error.requestData, null, 2)}
                            </pre>
                          </div>
                        )}
                        {error.fullLLMResponse && (
                          <div>
                            <p className="text-sm font-medium mb-2">Full LLM Response:</p>
                            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-96">
                              {error.fullLLMResponse}
                            </pre>
                          </div>
                        )}
                        {error.userId && (
                          <p className="text-xs text-muted-foreground">User ID: {error.userId}</p>
                        )}
                        {error.userAgent && (
                          <p className="text-xs text-muted-foreground">User Agent: {error.userAgent}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="sentences" className="space-y-4 mt-4">
              <div className="space-y-4">
                {recentSentences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sentences found</p>
                ) : (
                  recentSentences.map((sentence) => (
                    <Card key={sentence.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{sentence.sentence}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(sentence.timestamp)}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">User ID: {sentence.userId}</p>
                        <p className="text-xs text-muted-foreground">ID: {sentence.id}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4 mt-4">
              <div className="space-y-4">
                {recentQuizzes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No quizzes found</p>
                ) : (
                  recentQuizzes.map((quiz) => (
                    <Card key={quiz.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Score: {quiz.score} / {quiz.totalQuestions}
                          </CardTitle>
                          <Badge variant={quiz.score >= 80 ? "default" : quiz.score >= 60 ? "secondary" : "destructive"}>
                            {quiz.scoreCategory}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(quiz.timestamp)}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-2">{quiz.sentenceText}</p>
                        <p className="text-xs text-muted-foreground">User ID: {quiz.userId}</p>
                        <p className="text-xs text-muted-foreground">Sentence ID: {quiz.sentenceId}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Users ({allUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No users found</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <Card 
                          key={user.id} 
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setSelectedUserId(user.userId)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{user.userId}</p>
                                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>Sentences: {user.totalSentences || 0}</span>
                                  <span>Quizzes: {user.totalQuizzes || 0}</span>
                                  <span>Score: {user.totalQuizScore || 0}</span>
                                  <span>Streak: {user.currentStreak || 0}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Last Active: {formatTimestamp(user.updatedAt)}
                                </p>
                              </div>
                              <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4 rotate-180" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent User Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allUsers.slice(0, 10).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    ) : (
                      allUsers.slice(0, 10).map((user) => (
                        <Card
                          key={user.id}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setSelectedUserId(user.userId)}
                        >
                          <CardContent className="p-4">
                            <p className="text-sm font-medium">User ID: {user.userId}</p>
                            <p className="text-xs text-muted-foreground">
                              Sentences: {user.totalSentences || 0} | 
                              Quizzes: {user.totalQuizzes || 0} | 
                              Score: {user.totalQuizScore || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last Active: {formatTimestamp(user.updatedAt)}
                            </p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

