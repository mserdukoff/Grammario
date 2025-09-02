import { Timestamp } from "firebase/firestore";

export interface WordInfo {
  position: number;
  part_of_speech: string;
  root?: string | null;
  gender?: string | null;
  noun_components?: {
    affixes: string | null;
  };
  noun_case?: string | null;
  noun_case_components?: string | null;
  verb_tense?: string | null;
  verb_tense_components?: string[] | null;
  translation?: string | null; // English translation of the word
}

export interface LLMResponse {
  result?: {
    sentence: {
      [word: string]: WordInfo;
    };
    relationship_matrix: number[];
  };
  sentence?: {
    [word: string]: WordInfo;
  };
  relationship_matrix?: number[][] | number[] | { [key: string]: number };
}

export interface Sentence {
  id: string;
  userId: string;
  sentence: string;
  llmResponse: LLMResponse;
  timestamp: Timestamp;
  // Grammar Insights from the new robust analysis system
  analysisMetadata?: {
    errors: any[];
    teaching_notes: any[];
    normalized?: string;
    language?: string;
    tokens?: any[]; // Include tokens for morphological breakdown
  };
}

// New types for quiz functionality
export interface QuizQuestion {
  id: string;
  type: 'part_of_speech' | 'root_word' | 'suffix' | 'case' | 'tense';
  question: string;
  correctAnswer: string;
  options: string[];
  word: string;
  position: number;
}

export interface QuizResult {
  id: string;
  userId: string;
  sentenceId: string;
  questions: QuizQuestion[];
  userAnswers: { [questionId: string]: string };
  score: number;
  totalQuestions: number;
  timestamp: Timestamp;
}

// New types for progress tracking
export interface UserProgress {
  userId: string;
  totalSentencesAnalyzed: number;
  totalQuizzesTaken: number;
  averageQuizScore: number;
  wordsLearned: string[];
  lastActive: Timestamp;
  streakDays: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Timestamp;
}

// New types for vocabulary expansion
export interface VocabularyWord {
  word: string;
  partOfSpeech: string;
  synonyms: string[];
  relatedWords: string[];
  frequency: 'common' | 'uncommon' | 'rare';
  exampleSentences: string[];
}

export interface VocabularyEntry {
  id: string;
  userId: string;
  word: string;
  vocabularyData: VocabularyWord;
  addedAt: Timestamp;
  lastReviewed: Timestamp;
  masteryLevel: number; // 0-100
} 