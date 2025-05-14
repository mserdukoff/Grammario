import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSelectorProps {
  onLanguageSelect: (language: string) => void;
  onDemoSentenceSelect: (sentence: string) => void;
}

const DEMO_SENTENCES = {
  italian: "Ho visto una bella ragazza",
  // Add more languages and their demo sentences here
};

export default function LanguageSelector({ onLanguageSelect, onDemoSentenceSelect }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('italian');

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    onLanguageSelect(language);
    if (DEMO_SENTENCES[language as keyof typeof DEMO_SENTENCES]) {
      onDemoSentenceSelect(DEMO_SENTENCES[language as keyof typeof DEMO_SENTENCES]);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="italian">Italian</SelectItem>
          {/* Add more languages here */}
        </SelectContent>
      </Select>
    </div>
  );
} 