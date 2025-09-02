import { Analysis } from "./grammario";
import { LLMResponse, WordInfo } from "@/types";
import { depsToAdjMatrix } from "./grammario";
import type { 
  TurkicAnalysis, 
  SemiticAnalysis, 
  SlavicAnalysis, 
  RomanceAnalysis, 
  GermanicAnalysis 
} from "./grammario-groups";

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
 * Transforms any family-specific analysis format to the existing LLMResponse format
 * that the UI components expect.
 */
export function transformAnalysisToLLMResponse(
  analysis: Analysis | TurkicAnalysis | SemiticAnalysis | SlavicAnalysis | RomanceAnalysis | GermanicAnalysis
): LLMResponse {
  const sentence: { [word: string]: WordInfo } = {};
  
  // Transform each token to the old WordInfo format
  analysis.tokens.forEach((token, index) => {
    // Create a unique key using word and position (1-based)
    const key = `${token.text}_${index + 1}`;
    

    
    // Extract morphological components and family-specific fields
    const morphComponents = extractMorphologicalComponents(token);
    const rootComponent = morphComponents.find(c => c.type === 'root' || c.type === 'stem');
    const affixComponents = morphComponents.filter(c => c.type !== 'root' && c.type !== 'stem');
    
    // Get root from family-specific fields or fallback to base fields
    const root = extractRoot(token) || rootComponent?.form || token.lemma || token.text;
    
    const wordInfo: WordInfo = {
      position: index, // 0-based for compatibility
      part_of_speech: getFullPartOfSpeech(token.upos), // Convert UPOS to full name
      root,
      gender: extractGender(token),
      noun_components: affixComponents.length > 0 ? {
        affixes: affixComponents.map(c => 
          `${capitalizeFirst(c.form)}${c.function ? ` (${capitalizeFirst(c.function)})` : ''}`
        ).join(", ") || null
      } : { affixes: null }, // Always provide the object structure, never undefined
      noun_case: extractCase(token),
      noun_case_components: extractCaseComponents(token),
      verb_tense: extractTense(token),
      verb_tense_components: extractTenseComponents(token),
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
 * Extract morphological components from family-specific or base token
 */
function extractMorphologicalComponents(token: any): Array<{type: string, form: string, function?: string}> {


  // If OpenAI returned morphological_components as string array, convert to object format
  if (token.morphological_components && Array.isArray(token.morphological_components)) {
    const stringComponents = token.morphological_components as string[];
    const components: Array<{type: string, form: string, function?: string}> = [];
    

    
    // Convert string array to object array using suffix_chain for type/function info
    stringComponents.forEach((component, index) => {
      if (index === 0 && token.root) {
        // First component is usually the root
        components.push({ type: 'root', form: component });
      } else if (token.suffix_chain && token.suffix_chain[index - 1]) {
        // Map to corresponding suffix_chain entry
        const suffix = token.suffix_chain[index - 1];
        components.push({
          type: suffix.type || 'suffix',
          form: component,
          function: suffix.function
        });
      } else {
        // Fallback
        components.push({ type: 'suffix', form: component });
      }
    });
    

    return components;
  }
  
  // If already object array format, return as-is
  if (token.morphological_components && typeof token.morphological_components[0] === 'object') {

    return token.morphological_components;
  }
  
  // Family-specific extraction
  const components: Array<{type: string, form: string, function?: string}> = [];
  
  // Turkic: root + suffix_chain
  if (token.root && token.suffix_chain) {

    components.push({ type: 'root', form: token.root });
    token.suffix_chain.forEach((suffix: any) => {
      components.push({
        type: suffix.type || 'suffix',
        form: suffix.form,
        function: suffix.function
      });
    });

  }
  
  // Germanic: compound_parts + suffix_chain
  if (token.compound_parts && token.compound_parts.length > 0) {
    token.compound_parts.forEach((part: any) => {
      components.push({ type: 'compound', form: part.root, function: part.gloss });
    });
  }
  if (token.suffix_chain && !token.root) { // Don't double-add for Turkic
    token.suffix_chain.forEach((suffix: any) => {
      components.push({
        type: suffix.type || 'suffix',
        form: suffix.form,
        function: suffix.function
      });
    });
  }
  
  // Romance: stem + ending (check this first to avoid duplication)
  if (token.stem && token.ending && !token.prefix_chain) {
    // For irregular verbs, show the infinitive/lemma instead of just the stem
    if (token.irregular_stem && token.lemma && token.lemma !== token.text) {
      components.push({ 
        type: 'infinitive', 
        form: token.lemma, 
        function: 'base form' 
      });
      
      // Add grammatical information as a component
      const grammarInfo = [];
      if (token.features?.person && token.features?.number) {
        grammarInfo.push(`${token.features.person}${token.features.number === 'singular' ? 'sg' : 'pl'}`);
      }
      if (token.features?.tense) {
        grammarInfo.push(token.features.tense);
      }
      if (token.features?.mood) {
        grammarInfo.push(token.features.mood);
      }
      
      if (grammarInfo.length > 0) {
        components.push({
          type: 'inflection',
          form: `→ ${token.text}`,
          function: grammarInfo.join(' ')
        });
      }
    } else {
      // Check if this is actually a morphologically complex word
      // Don't break down simple words where stem+ending = whole word with no real morphology
      const isActuallyComplex = token.conjugation_class || 
                               (token.features && (token.features.person || token.features.tense || token.features.mood)) ||
                               (token.upos === 'VERB' || token.upos === 'AUX');
      
      // Also check if the "ending" is actually a meaningful morpheme
      const hasMeaningfulEnding = token.ending && token.ending.length > 0 && 
                                 (token.upos === 'VERB' || token.upos === 'AUX' || 
                                  (token.features && (token.features.gender || token.features.noun_number)));
      
      if (isActuallyComplex && hasMeaningfulEnding) {
        // Regular morphological breakdown for complex words
        components.push({ type: 'stem', form: token.stem });
        components.push({ type: 'ending', form: token.ending });
      }
      // If it's not actually complex, don't add any components (leave empty)
      // This will result in no morphological breakdown being shown
    }
  }
  // Slavic: prefix_chain + stem + ending (only if not already handled by Romance)
  else if (token.prefix_chain || (token.stem && !token.ending) || (!token.stem && token.ending)) {
    if (token.prefix_chain) {
      token.prefix_chain.forEach((prefix: any) => {
        components.push({
          type: 'prefix',
          form: prefix.form,
          function: prefix.function
        });
      });
    }
    if (token.stem) {
      components.push({ type: 'stem', form: token.stem });
    }
    if (token.ending) {
      components.push({ type: 'ending', form: token.ending });
    }
  }
  
  // Semitic: root_consonants + template + affixes
  if (token.root_consonants) {
    const rootForm = Array.isArray(token.root_consonants) 
      ? token.root_consonants.join('-') 
      : token.root_consonants;
    components.push({ type: 'root', form: rootForm });
    
    if (token.template) {
      components.push({ type: 'template', form: token.template });
    }
    
    if (token.affixes) {
      token.affixes.forEach((affix: any) => {
        components.push({
          type: affix.position || affix.type || 'affix',
          form: affix.form,
          function: affix.function
        });
      });
    }
  }
  

  return components;
}

/**
 * Extract root/lemma from family-specific or base token
 */
function extractRoot(token: any): string | null {
  return token.root || token.stem || token.lemma || null;
}

/**
 * Extract gender from family-specific features or base morphology
 */
function extractGender(token: any): string | null {
  const gender = token.features?.gender || token.morphology?.gender;
  return gender ? getFullGender(gender) : null;
}

/**
 * Extract case from family-specific features or base morphology
 */
function extractCase(token: any): string | null {
  const caseValue = token.features?.case || token.morphology?.case;
  return caseValue ? getFullCase(caseValue) : null;
}

/**
 * Extract case components from family-specific or base morphology
 */
function extractCaseComponents(token: any): string | null {
  const caseValue = token.features?.case || token.morphology?.case;
  return caseValue ? getFullCase(caseValue) : null;
}

/**
 * Extract tense from family-specific features or base morphology
 */
function extractTense(token: any): string | null {
  const tense = token.features?.tense || token.morphology?.tense;
  return tense ? getFullTense(tense) : null;
}

/**
 * Extract tense components from family-specific or base morphology
 */
function extractTenseComponents(token: any): string[] | null {
  const tense = token.features?.tense || token.morphology?.tense;
  return tense ? [getFullTense(tense)] : null;
}

/**
 * Removes all undefined values from an object recursively, replacing them with null
 * This prevents Firebase errors when saving data
 */
function sanitizeForFirebase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirebase).filter(item => item !== null);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedValue = sanitizeForFirebase(value);
    // Only include the key if the value is not null after sanitization
    if (sanitizedValue !== null) {
      sanitized[key] = sanitizedValue;
    }
  }
  return sanitized;
}

/**
 * Transforms the new Analysis format to include error information
 * that can be displayed in the UI.
 * Also ensures tokens have morphological_components for proper UI display.
 */
export function extractErrorsAndTeaching(
  analysis: Analysis | TurkicAnalysis | SemiticAnalysis | SlavicAnalysis | RomanceAnalysis | GermanicAnalysis
) {


  // Transform tokens to ensure they have morphological_components for UI
  const transformedTokens = analysis.tokens.map(token => {
    // Always extract morphological components to ensure proper format
    const morphComponents = extractMorphologicalComponents(token);
    

    
    return {
      ...token,
      morphological_components: morphComponents.length > 0 ? morphComponents : null
    };
  });

  return {
    errors: analysis.errors || [],
    teaching_notes: analysis.teaching_notes || [],
    normalized: analysis.normalized || analysis.original_sentence,
    language: analysis.language,
    tokens: transformedTokens // Include transformed tokens for morphological breakdown
  };
}
