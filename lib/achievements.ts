import { Achievement } from '@/types/progress';

export const ACHIEVEMENTS: Achievement[] = [
  // Grammar achievements
  {
    id: 'first_sentence',
    title: 'First Steps',
    description: 'Analyze your first sentence',
    icon: '🌱',
    category: 'grammar',
    requirement: 1
  },
  {
    id: 'grammar_explorer',
    title: 'Grammar Explorer',
    description: 'Analyze 10 sentences',
    icon: '🔍',
    category: 'grammar',
    requirement: 10
  },
  {
    id: 'grammar_scholar',
    title: 'Grammar Scholar',
    description: 'Analyze 50 sentences',
    icon: '📚',
    category: 'grammar',
    requirement: 50
  },
  {
    id: 'grammar_master',
    title: 'Grammar Master',
    description: 'Analyze 100 sentences',
    icon: '🎓',
    category: 'grammar',
    requirement: 100
  },

  // Quiz achievements
  {
    id: 'quiz_beginner',
    title: 'Quiz Novice',
    description: 'Complete your first quiz',
    icon: '🧩',
    category: 'quiz',
    requirement: 1
  },
  {
    id: 'quiz_enthusiast',
    title: 'Quiz Enthusiast',
    description: 'Complete 10 quizzes',
    icon: '🎯',
    category: 'quiz',
    requirement: 10
  },
  {
    id: 'perfect_score',
    title: 'Perfect Score',
    description: 'Get 100% on a quiz',
    icon: '⭐',
    category: 'quiz',
    requirement: 100 // percentage
  },
  {
    id: 'quiz_streak',
    title: 'Quiz Streak',
    description: 'Complete 5 quizzes in a row with 80%+',
    icon: '🔥',
    category: 'quiz',
    requirement: 5
  },

  // Vocabulary achievements
  {
    id: 'word_collector',
    title: 'Word Collector',
    description: 'Expand vocabulary for 25 words',
    icon: '📖',
    category: 'vocabulary',
    requirement: 25
  },
  {
    id: 'vocabulary_builder',
    title: 'Vocabulary Builder',
    description: 'Expand vocabulary for 100 words',
    icon: '📝',
    category: 'vocabulary',
    requirement: 100
  },
  {
    id: 'polyglot_beginner',
    title: 'Polyglot Beginner',
    description: 'Study words in 3 different languages',
    icon: '🌍',
    category: 'vocabulary',
    requirement: 3
  },

  // Streak achievements
  {
    id: 'daily_learner',
    title: 'Daily Learner',
    description: 'Study for 3 days in a row',
    icon: '📅',
    category: 'streak',
    requirement: 3
  },
  {
    id: 'weekly_warrior',
    title: 'Weekly Warrior',
    description: 'Study for 7 days in a row',
    icon: '🗓️',
    category: 'streak',
    requirement: 7
  },
  {
    id: 'dedication_master',
    title: 'Dedication Master',
    description: 'Study for 30 days in a row',
    icon: '🏆',
    category: 'streak',
    requirement: 30
  },

  // Milestone achievements
  {
    id: 'time_invested',
    title: 'Time Invested',
    description: 'Spend 1 hour studying',
    icon: '⏰',
    category: 'milestone',
    requirement: 60 // minutes
  },
  {
    id: 'scholar_hours',
    title: 'Scholar Hours',
    description: 'Spend 10 hours studying',
    icon: '📊',
    category: 'milestone',
    requirement: 600 // minutes
  },
  {
    id: 'language_specialist',
    title: 'Language Specialist',
    description: 'Analyze 50 sentences in a single language',
    icon: '🎯',
    category: 'milestone',
    requirement: 50
  }
];

export function checkAchievements(
  currentProgress: any,
  newActivity: {
    type: 'sentence' | 'quiz' | 'vocabulary' | 'session';
    data: any;
  }
): Achievement[] {
  const unlockedAchievements: Achievement[] = [];
  
  ACHIEVEMENTS.forEach(achievement => {
    if (currentProgress.achievementIds?.includes(achievement.id)) {
      return; // Already unlocked
    }

    let shouldUnlock = false;

    switch (achievement.category) {
      case 'grammar':
        shouldUnlock = currentProgress.totalSentences >= achievement.requirement;
        break;
      
      case 'quiz':
        if (achievement.id === 'quiz_beginner' || achievement.id === 'quiz_enthusiast') {
          shouldUnlock = currentProgress.totalQuizzes >= achievement.requirement;
        } else if (achievement.id === 'perfect_score') {
          shouldUnlock = newActivity.type === 'quiz' && 
                        newActivity.data.percentage === 100;
        }
        break;
      
      case 'vocabulary':
        if (achievement.id === 'word_collector' || achievement.id === 'vocabulary_builder') {
          shouldUnlock = currentProgress.vocabularySize >= achievement.requirement;
        } else if (achievement.id === 'polyglot_beginner') {
          shouldUnlock = Object.keys(currentProgress.languageProgress || {}).length >= achievement.requirement;
        }
        break;
      
      case 'streak':
        shouldUnlock = currentProgress.currentStreak >= achievement.requirement;
        break;
      
      case 'milestone':
        if (achievement.id === 'time_invested' || achievement.id === 'scholar_hours') {
          const totalTime = Object.values(currentProgress.languageProgress || {})
            .reduce((sum: number, lang: any) => sum + (lang.timeSpent || 0), 0);
          shouldUnlock = totalTime >= achievement.requirement;
        } else if (achievement.id === 'language_specialist') {
          shouldUnlock = Object.values(currentProgress.languageProgress || {})
            .some((lang: any) => lang.sentencesAnalyzed >= achievement.requirement);
        }
        break;
    }

    if (shouldUnlock) {
      unlockedAchievements.push(achievement);
    }
  });

  return unlockedAchievements;
}


