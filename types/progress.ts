import { Timestamp } from "firebase/firestore";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'grammar' | 'vocabulary' | 'streak' | 'quiz' | 'milestone';
  requirement: number;
  unlockedAt?: Timestamp;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: number; // in minutes
  sentencesAnalyzed: number;
  quizzesCompleted: number;
  quizScore: number;
  vocabularyExpansions: number;
  languagesStudied: string[];
  wordsLearned: string[];
}

export interface UserProgress {
  userId: string;
  totalSentences: number;
  totalQuizzes: number;
  totalQuizScore: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Timestamp;
  vocabularySize: number;
  achievementIds: string[];
  languageProgress: {
    [language: string]: {
      sentencesAnalyzed: number;
      wordsLearned: number;
      averageQuizScore: number;
      timeSpent: number; // in minutes
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserStats {
  progress: UserProgress;
  achievements: Achievement[];
  recentSessions: StudySession[];
  streakData: {
    current: number;
    longest: number;
    daysActive: number[];
  };
  vocabularyGrowth: {
    date: string;
    count: number;
  }[];
}




