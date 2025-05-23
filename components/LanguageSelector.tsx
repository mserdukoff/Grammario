import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { LLMResponse } from '@/types';

interface LanguageSelectorProps {
  onLanguageSelect: (language: string) => void;
  onDemoSentenceSelect: (sentence: string, response: LLMResponse) => void;
}

export const SUPPORTED_LANGUAGES = {
  english: 'English',
  german: 'German',
  spanish: 'Spanish',
  italian: 'Italian',
  portuguese: 'Portuguese',
  russian: 'Russian',
  ukrainian: 'Ukrainian',
  turkish: 'Turkish'
} as const;

export const DEMO_SENTENCES = {
  english: "The quick brown fox jumps over the lazy dog",
  german: "Der schnelle braune Fuchs springt über den faulen Hund",
  spanish: "El rápido zorro marrón salta sobre el perro perezoso",
  italian: "La volpe marrone salta velocemente sopra il cane pigro",
  portuguese: "A rápida raposa marrom salta sobre o cão preguiçoso",
  russian: "Быстрая коричневая лиса перепрыгивает через ленивую собаку",
  ukrainian: "Швидка бура лисиця перестрибує ледачого пса",
  turkish: "Hızlı kahverengi tilki tembel köpeğin üzerinden atlar"
} as const;

export const DEMO_RESPONSES = {
  english: {
    result: {
      sentence: {
        "The": {
          position: 1,
          part_of_speech: "article",
          gender: "definite"
        },
        "quick": {
          position: 2,
          part_of_speech: "adjective"
        },
        "brown": {
          position: 3,
          part_of_speech: "adjective"
        },
        "fox": {
          position: 4,
          part_of_speech: "noun",
          gender: "masculine",
          noun_components: {
            affixes: null
          }
        },
        "jumps": {
          position: 5,
          part_of_speech: "verb",
          root: "jump",
          verb_tense: "present",
          verb_tense_components: ["jump-s"]
        },
        "over": {
          position: 6,
          part_of_speech: "preposition"
        },
        "the": {
          position: 7,
          part_of_speech: "article",
          gender: "definite"
        },
        "lazy": {
          position: 8,
          part_of_speech: "adjective"
        },
        "dog": {
          position: 9,
          part_of_speech: "noun",
          gender: "masculine",
          noun_components: {
            affixes: null
          }
        }
      },
      relationship_matrix: [
        0, 1, 1, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 1, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 1, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 1, 1, 1,
        0, 0, 0, 0, 0, 0, 0, 1, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  },
  german: {
    result: {
      sentence: {
        "Der": {
          position: 1,
          part_of_speech: "article",
          root: "der",
          gender: "masculine",
          noun_case: "nominative",
          noun_case_components: "Der"
        },
        "schnelle": {
          position: 2,
          part_of_speech: "adjective",
          root: "schnell",
          gender: "masculine",
          noun_case: "nominative",
          noun_case_components: "e"
        },
        "braune": {
          position: 3,
          part_of_speech: "adjective",
          root: "braun",
          gender: "masculine",
          noun_case: "nominative",
          noun_case_components: "e"
        },
        "Fuchs": {
          position: 4,
          part_of_speech: "noun",
          root: "Fuchs",
          gender: "masculine",
          noun_case: "nominative"
        },
        "springt": {
          position: 5,
          part_of_speech: "verb",
          root: "springen",
          verb_tense: "present",
          verb_tense_components: ["-t"]
        },
        "über": {
          position: 6,
          part_of_speech: "preposition",
          root: "über"
        },
        "den": {
          position: 7,
          part_of_speech: "article",
          root: "der",
          gender: "masculine",
          noun_case: "accusative",
          noun_case_components: "den"
        },
        "faulen": {
          position: 8,
          part_of_speech: "adjective",
          root: "faul",
          gender: "masculine",
          noun_case: "accusative",
          noun_case_components: "en"
        },
        "Hund": {
          position: 9,
          part_of_speech: "noun",
          root: "Hund",
          gender: "masculine",
          noun_case: "accusative"
        }
      },
      relationship_matrix: [
        0, 1, 1, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 1, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 1, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 1, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  },
  spanish: {
    result: {
      sentence: {
        "El": {
          position: 1,
          part_of_speech: "article",
          root: "el"
        },
        "rápido": {
          position: 2,
          part_of_speech: "adjective",
          root: "rápido"
        },
        "zorro": {
          position: 3,
          part_of_speech: "noun",
          root: "zorro",
          gender: "masculine"
        },
        "marrón": {
          position: 4,
          part_of_speech: "adjective",
          root: "marrón"
        },
        "salta": {
          position: 5,
          part_of_speech: "verb",
          root: "saltar",
          verb_tense: "present",
          verb_tense_components: ["-a"]
        },
        "sobre": {
          position: 6,
          part_of_speech: "preposition",
          root: "sobre"
        },
        "el": {
          position: 7,
          part_of_speech: "article",
          root: "el"
        },
        "perro": {
          position: 8,
          part_of_speech: "noun",
          root: "perro",
          gender: "masculine"
        },
        "perezoso": {
          position: 9,
          part_of_speech: "adjective",
          root: "perezoso"
        }
      },
      relationship_matrix: [
        0, 1, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 1, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 1, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  },
  italian: {
    result: {
      sentence: {
        "La": {
          position: 1,
          part_of_speech: "article",
          root: "il",
          gender: "feminine"
        },
        "volpe": {
          position: 2,
          part_of_speech: "noun",
          root: "volpe",
          gender: "feminine"
        },
        "marrone": {
          position: 3,
          part_of_speech: "adjective",
          root: "marrone"
        },
        "salta": {
          position: 4,
          part_of_speech: "verb",
          root: "saltare",
          verb_tense: "present",
          verb_tense_components: ["-a"]
        },
        "velocemente": {
          position: 5,
          part_of_speech: "adverb",
          root: "velocemente"
        },
        "sopra": {
          position: 6,
          part_of_speech: "preposition",
          root: "sopra"
        },
        "il": {
          position: 7,
          part_of_speech: "article",
          root: "il",
          gender: "masculine"
        },
        "cane": {
          position: 8,
          part_of_speech: "noun",
          root: "cane",
          gender: "masculine"
        },
        "pigro": {
          position: 9,
          part_of_speech: "adjective",
          root: "pigro"
        }
      },
      relationship_matrix: [
        0, 1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        1, 0, 0, 0, 1, 1, 0, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  },
  portuguese: {
    result: {
      sentence: {
        "A": {
          position: 1,
          part_of_speech: "article",
          root: "a",
          gender: "feminine"
        },
        "rápida": {
          position: 2,
          part_of_speech: "adjective",
          root: "rápido",
          gender: "feminine"
        },
        "raposa": {
          position: 3,
          part_of_speech: "noun",
          root: "raposa",
          gender: "feminine"
        },
        "marrom": {
          position: 4,
          part_of_speech: "adjective",
          root: "marrom"
        },
        "salta": {
          position: 5,
          part_of_speech: "verb",
          root: "saltar",
          verb_tense: "present",
          verb_tense_components: ["-a"]
        },
        "sobre": {
          position: 6,
          part_of_speech: "preposition",
          root: "sobre"
        },
        "o": {
          position: 7,
          part_of_speech: "article",
          root: "o",
          gender: "masculine"
        },
        "cão": {
          position: 8,
          part_of_speech: "noun",
          root: "cão",
          gender: "masculine"
        },
        "preguiçoso": {
          position: 9,
          part_of_speech: "adjective",
          root: "preguiçoso",
          gender: "masculine"
        }
      },
      relationship_matrix: [
        0, 1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 1, 1, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 1, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 1, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0, 0, 0
      ]
    }
  },
  russian: {
    result: {
      sentence: {
        "Быстрая": {
          position: 1,
          part_of_speech: "adjective",
          root: "быстрый",
          gender: "feminine"
        },
        "коричневая": {
          position: 2,
          part_of_speech: "adjective",
          root: "коричневый",
          gender: "feminine"
        },
        "лиса": {
          position: 3,
          part_of_speech: "noun",
          root: "лиса",
          gender: "feminine",
          noun_case: "nominative"
        },
        "перепрыгивает": {
          position: 4,
          part_of_speech: "verb",
          root: "перепрыгивать",
          verb_tense: "present"
        },
        "через": {
          position: 5,
          part_of_speech: "preposition",
          root: "через"
        },
        "ленивую": {
          position: 6,
          part_of_speech: "adjective",
          root: "ленивый",
          gender: "feminine",
          noun_case: "accusative"
        },
        "собаку": {
          position: 7,
          part_of_speech: "noun",
          root: "собака",
          gender: "feminine",
          noun_case: "accusative"
        }
      },
      relationship_matrix: [
        0, 1, 1, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0, 0,
        0, 0, 0, 1, 0, 0, 0,
        0, 0, 0, 0, 1, 0, 1,
        0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0
      ]
    }
  },
  ukrainian: {
    result: {
      sentence: {
        "Швидка": {
          position: 1,
          part_of_speech: "adjective",
          root: "швидкий",
          gender: "feminine"
        },
        "бура": {
          position: 2,
          part_of_speech: "adjective",
          root: "бурий",
          gender: "feminine"
        },
        "лисиця": {
          position: 3,
          part_of_speech: "noun",
          root: "лисиця",
          gender: "feminine",
          noun_case: "nominative"
        },
        "перестрибує": {
          position: 4,
          part_of_speech: "verb",
          root: "перестрибувати",
          verb_tense: "present"
        },
        "ледачого": {
          position: 5,
          part_of_speech: "adjective",
          root: "ледачий",
          gender: "masculine",
          noun_case: "genitive"
        },
        "пса": {
          position: 6,
          part_of_speech: "noun",
          root: "пес",
          gender: "masculine",
          noun_case: "genitive"
        }
      },
      relationship_matrix: [
        0, 1, 1, 0, 0, 0,
        0, 0, 1, 0, 0, 0,
        0, 0, 0, 1, 0, 0,
        0, 0, 0, 0, 1, 1,
        0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0
      ]
    }
  },
  turkish: {
    result: {
      sentence: {
        "Hızlı": {
          position: 1,
          part_of_speech: "adjective",
          root: "hızlı"
        },
        "kahverengi": {
          position: 2,
          part_of_speech: "adjective",
          root: "kahverengi"
        },
        "tilki": {
          position: 3,
          part_of_speech: "noun",
          root: "tilki",
          gender: "neuter",
          noun_case: "nominative"
        },
        "tembel": {
          position: 4,
          part_of_speech: "adjective",
          root: "tembel"
        },
        "köpeğin": {
          position: 5,
          part_of_speech: "noun",
          root: "köpek",
          gender: "neuter",
          noun_case: "genitive",
          noun_case_components: "-in"
        },
        "üzerinden": {
          position: 6,
          part_of_speech: "postposition",
          root: "üzer",
          noun_case: "ablative",
          noun_case_components: "-den"
        },
        "atlar": {
          position: 7,
          part_of_speech: "verb",
          root: "atlamak",
          verb_tense: "present",
          verb_tense_components: ["-r"]
        }
      },
      relationship_matrix: [
        0, 0, 1, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 1, 0, 0,
        0, 0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 0, 0, 0
      ]
    }
  }
};

export default function LanguageSelector({ onLanguageSelect, onDemoSentenceSelect }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('english');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const isMobile = window.innerWidth < 640;

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    onLanguageSelect(language);
    // Only trigger demo sentence after language is selected
    const sentence = DEMO_SENTENCES[language as keyof typeof DEMO_SENTENCES];
    const response = DEMO_RESPONSES[language as keyof typeof DEMO_RESPONSES];
    onDemoSentenceSelect(sentence, response);
    // Hide the language selector after selection
    setShowLanguageSelector(false);
  };

  const handleDemoClick = () => {
    setShowLanguageSelector(prev => !prev);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDemoClick}
        className="flex items-center gap-2"
      >
        {isMobile ? 'D' : 'Demo'}
        <ChevronDown className="h-4 w-4" />
      </Button>
      <AnimatePresence>
        {showLanguageSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-48 bg-background border rounded-md shadow-lg z-50"
          >
            <div className="p-2">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm"
                >
                  {name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 