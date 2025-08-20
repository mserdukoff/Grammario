'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { type Analysis } from '@/lib/grammario'

// Extract types from the Analysis schema
type MorphologicalComponent = NonNullable<NonNullable<Analysis['tokens']>[number]['morphological_components']>[number]

interface MorphologyBreakdownProps {
  word: string
  components: MorphologicalComponent[]
}

export default function MorphologyBreakdown({ word, components }: MorphologyBreakdownProps) {
  if (!components || components.length === 0) {
    return null
  }

  // Sort components to show root/stem first, then others
  const sortedComponents = [...components].sort((a, b) => {
    const rootTypes = ['root', 'stem']
    const aIsRoot = rootTypes.includes(a.type)
    const bIsRoot = rootTypes.includes(b.type)
    
    if (aIsRoot && !bIsRoot) return -1
    if (!aIsRoot && bIsRoot) return 1
    return 0
  })

  const getComponentColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'root':
      case 'stem':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'prefix':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'suffix':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'ending':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <Card className="mt-4 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400">🔍</span>
          Word Breakdown: "{word}"
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual breakdown */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {sortedComponents.map((component, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400">+</span>
              )}
              <Badge 
                variant="secondary" 
                className={`${getComponentColor(component.type)} font-mono text-sm px-3 py-1`}
              >
                {component.form}
              </Badge>
            </div>
          ))}
        </div>

        <Separator />

        {/* Detailed breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Component Details:</h4>
          {sortedComponents.map((component, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
              <Badge className={getComponentColor(component.type)}>
                {component.type}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-lg">{component.form}</span>
                  {component.function && (
                    <Badge variant="outline" className="text-xs">
                      {component.function}
                    </Badge>
                  )}
                </div>
                {component.meaning && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Meaning: {component.meaning}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Assembly demonstration */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How it's built:</strong>{' '}
            {sortedComponents.map((comp, i) => (
              <span key={i}>
                {i > 0 && ' + '}
                <span className="font-mono">{comp.form}</span>
                {comp.meaning && ` (${comp.meaning})`}
              </span>
            ))}
            {' '}= <span className="font-mono font-bold">{word}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
