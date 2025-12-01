import { collection, doc, setDoc, getDoc, updateDoc, query, where, orderBy, limit, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProgress, StudySession, Achievement } from '@/types/progress';
import { ACHIEVEMENTS, checkAchievements } from './achievements';
import { getTimestampMillis } from './utils';

export class ProgressTracker {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initializeProgress(): Promise<UserProgress> {
    const progressRef = doc(db, 'user_progress', this.userId);
    const progressDoc = await getDoc(progressRef);

    if (!progressDoc.exists()) {
      const initialProgress: UserProgress = {
        userId: this.userId,
        totalSentences: 0,
        totalQuizzes: 0,
        totalQuizScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: Timestamp.now(),
        vocabularySize: 0,
        achievementIds: [],
        languageProgress: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(progressRef, initialProgress);
      return initialProgress;
    }

    return progressDoc.data() as UserProgress;
  }

  async getProgress(): Promise<UserProgress | null> {
    const progressRef = doc(db, 'user_progress', this.userId);
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      return await this.initializeProgress();
    }
    
    return progressDoc.data() as UserProgress;
  }

  async updateProgress(updates: Partial<UserProgress>): Promise<void> {
    const progressRef = doc(db, 'user_progress', this.userId);
    await updateDoc(progressRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  async recordSentenceAnalysis(sentence: string, language: string): Promise<Achievement[]> {
    const progress = await this.getProgress();
    if (!progress) return [];

    // Update streak
    const today = new Date().toDateString();
    const lastActive = new Date(getTimestampMillis(progress.lastActiveDate)).toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    let newStreak = progress.currentStreak;
    if (today !== lastActive) {
      if (lastActive === yesterday) {
        newStreak = progress.currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    // Update language-specific progress
    const languageProgress = progress.languageProgress || {};
    const currentLangProgress = languageProgress[language] || {
      sentencesAnalyzed: 0,
      wordsLearned: 0,
      averageQuizScore: 0,
      timeSpent: 0
    };

    languageProgress[language] = {
      ...currentLangProgress,
      sentencesAnalyzed: currentLangProgress.sentencesAnalyzed + 1
    };

    const updates: Partial<UserProgress> = {
      totalSentences: progress.totalSentences + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(progress.longestStreak, newStreak),
      lastActiveDate: Timestamp.now(),
      languageProgress
    };

    await this.updateProgress(updates);

    // Check for new achievements
    const newAchievements = checkAchievements(
      { ...progress, ...updates },
      { type: 'sentence', data: { sentence, language } }
    );

    if (newAchievements.length > 0) {
      await this.unlockAchievements(newAchievements);
    }

    return newAchievements;
  }

  async recordQuizCompletion(score: number, totalQuestions: number, language: string): Promise<Achievement[]> {
    const progress = await this.getProgress();
    if (!progress) return [];

    const percentage = Math.round((score / totalQuestions) * 100);
    
    // Update language-specific progress
    const languageProgress = progress.languageProgress || {};
    const currentLangProgress = languageProgress[language] || {
      sentencesAnalyzed: 0,
      wordsLearned: 0,
      averageQuizScore: 0,
      timeSpent: 0
    };

    const newQuizCount = progress.totalQuizzes + 1;
    const newTotalScore = progress.totalQuizScore + percentage;
    const newAverageQuizScore = Math.round(newTotalScore / newQuizCount);

    languageProgress[language] = {
      ...currentLangProgress,
      averageQuizScore: newAverageQuizScore
    };

    const updates: Partial<UserProgress> = {
      totalQuizzes: newQuizCount,
      totalQuizScore: newTotalScore,
      languageProgress
    };

    await this.updateProgress(updates);

    // Check for new achievements
    const newAchievements = checkAchievements(
      { ...progress, ...updates },
      { type: 'quiz', data: { score, totalQuestions, percentage } }
    );

    if (newAchievements.length > 0) {
      await this.unlockAchievements(newAchievements);
    }

    return newAchievements;
  }

  async recordVocabularyExpansion(word: string, language: string): Promise<Achievement[]> {
    const progress = await this.getProgress();
    if (!progress) return [];

    const updates: Partial<UserProgress> = {
      vocabularySize: progress.vocabularySize + 1
    };

    await this.updateProgress(updates);

    // Check for new achievements
    const newAchievements = checkAchievements(
      { ...progress, ...updates },
      { type: 'vocabulary', data: { word, language } }
    );

    if (newAchievements.length > 0) {
      await this.unlockAchievements(newAchievements);
    }

    return newAchievements;
  }

  async startSession(): Promise<string> {
    const session: Omit<StudySession, 'id'> = {
      userId: this.userId,
      startTime: Timestamp.now(),
      endTime: Timestamp.now(), // Will be updated when session ends
      duration: 0,
      sentencesAnalyzed: 0,
      quizzesCompleted: 0,
      quizScore: 0,
      vocabularyExpansions: 0,
      languagesStudied: [],
      wordsLearned: []
    };

    const sessionRef = await addDoc(collection(db, 'study_sessions'), session);
    return sessionRef.id;
  }

  async endSession(sessionId: string, sessionData: Partial<StudySession>): Promise<void> {
    const sessionRef = doc(db, 'study_sessions', sessionId);
    await updateDoc(sessionRef, {
      ...sessionData,
      endTime: Timestamp.now()
    });
  }

  async getRecentSessions(limit_count: number = 10): Promise<StudySession[]> {
    const sessionsRef = collection(db, 'study_sessions');
    // Simplified query - filter by userId only, then sort in memory
    const q = query(
      sessionsRef,
      where('userId', '==', this.userId)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudySession));
    
    // Sort by startTime in memory and limit results
    return sessions
      .sort((a, b) => getTimestampMillis(b.startTime) - getTimestampMillis(a.startTime))
      .slice(0, limit_count);
  }

  async unlockAchievements(achievements: Achievement[]): Promise<void> {
    const progress = await this.getProgress();
    if (!progress) return;

    const newAchievementIds = achievements.map(a => a.id);
    const updatedAchievementIds = [...(progress.achievementIds || []), ...newAchievementIds];

    await this.updateProgress({
      achievementIds: updatedAchievementIds
    });

    // Store individual achievement unlock records
    for (const achievement of achievements) {
      await addDoc(collection(db, 'achievement_unlocks'), {
        userId: this.userId,
        achievementId: achievement.id,
        unlockedAt: Timestamp.now()
      });
    }
  }

  async getUnlockedAchievements(): Promise<Achievement[]> {
    const progress = await this.getProgress();
    if (!progress?.achievementIds) return [];

    return ACHIEVEMENTS.filter(achievement => 
      progress.achievementIds.includes(achievement.id)
    );
  }

  async getAvailableAchievements(): Promise<Achievement[]> {
    const progress = await this.getProgress();
    if (!progress) return ACHIEVEMENTS;

    return ACHIEVEMENTS.filter(achievement => 
      !progress.achievementIds?.includes(achievement.id)
    );
  }
}
