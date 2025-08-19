'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, X, Sparkles } from 'lucide-react'
import { Achievement } from '@/types/progress'

interface AchievementNotificationProps {
  achievements: Achievement[]
  onClose: () => void
}

export default function AchievementNotification({ achievements, onClose }: AchievementNotificationProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (achievements.length === 0) {
      setIsVisible(false)
      return
    }

    // Auto-advance through achievements
    if (currentIndex < achievements.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      // Auto-close after showing all achievements
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, achievements.length, onClose])

  if (!isVisible || achievements.length === 0) return null

  const currentAchievement = achievements[currentIndex]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        className="fixed bottom-4 right-4 z-[100] max-w-sm"
      >
        <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 border-yellow-300 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <Trophy className="h-6 w-6 text-white" />
                </motion.div>
                <span className="text-white font-semibold text-sm">Achievement Unlocked!</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                className="text-3xl"
              >
                {currentAchievement.icon}
              </motion.div>
              
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">
                  {currentAchievement.title}
                </h3>
                <p className="text-white/90 text-sm">
                  {currentAchievement.description}
                </p>
              </div>
            </div>
            
            {achievements.length > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {achievements.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 w-6 rounded-full transition-colors ${
                        index === currentIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white/80 text-xs">
                  {currentIndex + 1} of {achievements.length}
                </span>
              </div>
            )}
            
            <motion.div
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="h-8 w-8 text-yellow-200" />
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
