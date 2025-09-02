"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_LANGUAGES } from './LanguageSelector';

interface LanguageDropdownProps {
  selectedLanguage: string;
  onLanguageSelect: (language: string) => void;
  className?: string;
}

export default function LanguageDropdown({ selectedLanguage, onLanguageSelect, className = "" }: LanguageDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLanguageChange = (language: string) => {
    onLanguageSelect(language);
    setShowDropdown(false);
  };

  const selectedLanguageName = SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES] || 'Select Language';

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-between gap-2 w-full"
      >
        <span>{selectedLanguageName}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            <div className="p-2">
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLanguageChange(code)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm transition-colors ${
                    code === selectedLanguage ? 'bg-accent' : ''
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Backdrop to close dropdown when clicking outside */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
