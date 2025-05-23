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
} 