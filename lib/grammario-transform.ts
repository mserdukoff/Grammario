import { Analysis } from "./grammario";
import { LLMResponse, WordInfo } from "@/types";
import { depsToAdjMatrix } from "./grammario";

/**
 * Maps UPOS tags to full part-of-speech names
 */
function getFullPartOfSpeech(upos: string): string {
  const uposMap: Record<string, string> = {
    'ADJ': 'Adjective',
    'ADP': 'Adposition',
    'ADV': 'Adverb',
    'AUX': 'Auxiliary',
    'CCONJ': 'Coordinating Conjunction',
    'DET': 'Determiner',
    'INTJ': 'Interjection',
    'NOUN': 'Noun',
    'NUM': 'Numeral',
    'PART': 'Particle',
    'PRON': 'Pronoun',
    'PROPN': 'Proper Noun',
    'PUNCT': 'Punctuation',
    'SCONJ': 'Subordinating Conjunction',
    'SYM': 'Symbol',
    'VERB': 'Verb',
    'X': 'Other'
  };
  
  return uposMap[upos] || upos; // Return original if not found
}

/**
 * Maps grammatical cases to full names
 */
function getFullCase(caseAbbr: string): string {
  const caseMap: Record<string, string> = {
    'nom': 'Nominative',
    'acc': 'Accusative',
    'gen': 'Genitive',
    'dat': 'Dative',
    'ins': 'Instrumental',
    'loc': 'Locative',
    'voc': 'Vocative',
    'abl': 'Ablative',
    'com': 'Comitative',
    'ess': 'Essive',
    'tra': 'Translative',
    'par': 'Partitive',
    'dis': 'Distributive',
    'ine': 'Inessive',
    'ill': 'Illative',
    'ela': 'Elative',
    'add': 'Additive',
    'ade': 'Adessive',
    'all': 'Allative',
    'sub': 'Sublative',
    'sup': 'Superessive',
    'del': 'Delative',
    'ter': 'Terminative'
  };
  
  return caseMap[caseAbbr.toLowerCase()] || capitalizeFirst(caseAbbr);
}

/**
 * Maps verb tenses to full names
 */
function getFullTense(tenseAbbr: string): string {
  const tenseMap: Record<string, string> = {
    'pres': 'Present',
    'past': 'Past',
    'fut': 'Future',
    'imp': 'Imperfect',
    'pqp': 'Pluperfect',
    'prf': 'Perfect',
    'aor': 'Aorist',
    'cond': 'Conditional',
    'subj': 'Subjunctive',
    'opt': 'Optative',
    'imper': 'Imperative',
    'inf': 'Infinitive',
    'part': 'Participle',
    'ger': 'Gerund',
    'sup': 'Supine'
  };
  
  return tenseMap[tenseAbbr.toLowerCase()] || capitalizeFirst(tenseAbbr);
}

/**
 * Maps gender abbreviations to full names
 */
function getFullGender(genderAbbr: string): string {
  const genderMap: Record<string, string> = {
    'masc': 'Masculine',
    'fem': 'Feminine',
    'neut': 'Neuter',
    'com': 'Common'
  };
  
  return genderMap[genderAbbr.toLowerCase()] || capitalizeFirst(genderAbbr);
}

/**
 * Capitalizes the first letter of a string
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Transforms the new Analysis format from the robust prompt system
 * to the existing LLMResponse format that the UI components expect.
 */
export function transformAnalysisToLLMResponse(analysis: Analysis): LLMResponse {
  const sentence: { [word: string]: WordInfo } = {};
  
  // Transform each token to the old WordInfo format
  analysis.tokens.forEach((token, index) => {
    // Create a unique key using word and position (1-based)
    const key = `${token.text}_${index + 1}`;
    
    // Extract morphological components if available
    const morphComponents = token.morphological_components || [];
    const rootComponent = morphComponents.find(c => c.type === 'root' || c.type === 'stem');
    const affixComponents = morphComponents.filter(c => c.type !== 'root' && c.type !== 'stem');
    
    const wordInfo: WordInfo = {
      position: index, // 0-based for compatibility
      part_of_speech: getFullPartOfSpeech(token.upos), // Convert UPOS to full name
      root: rootComponent?.form || token.lemma || token.text,
      gender: token.morphology?.gender ? getFullGender(token.morphology.gender) : null,
      noun_components: affixComponents.length > 0 ? {
        affixes: affixComponents.map(c => 
          `${capitalizeFirst(c.form)}${c.function ? ` (${capitalizeFirst(c.function)})` : ''}`
        ).join(", ") || null
      } : { affixes: null }, // Always provide the object structure, never undefined
      noun_case: token.morphology?.case ? getFullCase(token.morphology.case) : null,
      noun_case_components: token.morphology?.case ? getFullCase(token.morphology.case) : null, // Simplified mapping
      verb_tense: token.morphology?.tense ? getFullTense(token.morphology.tense) : null,
      verb_tense_components: token.morphology?.tense ? [getFullTense(token.morphology.tense)] : null,
    };
    
    sentence[key] = wordInfo;
  });
  
  // Generate relationship matrix from heads or use adjacency matrix helper
  let relationshipMatrix: number[] = [];
  
  if (analysis.tokens.length > 0) {
    const adjMatrix = depsToAdjMatrix(analysis.tokens);
    // Flatten 2D matrix to 1D for compatibility
    relationshipMatrix = adjMatrix.flat();
  }
  
  // Match the exact format expected by the UI (double nested result)
  const response = {
    result: {
      result: {
        sentence,
        relationship_matrix: relationshipMatrix
      }
    }
  };
  
  // Sanitize to prevent Firebase undefined value errors
  return sanitizeForFirebase(response);
}

/**
 * Removes all undefined values from an object recursively, replacing them with null
 * This prevents Firebase errors when saving data
 */
function sanitizeForFirebase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirebase);
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeForFirebase(value);
  }
  return sanitized;
}

/**
 * Transforms the new Analysis format to include error information
 * that can be displayed in the UI.
 */
export function extractErrorsAndTeaching(analysis: Analysis) {
  return {
    errors: analysis.errors || [],
    teaching_notes: analysis.teaching_notes || [],
    normalized: analysis.normalized || analysis.original_sentence,
    language: analysis.language,
    tokens: analysis.tokens // Include tokens for morphological breakdown
  };
}
