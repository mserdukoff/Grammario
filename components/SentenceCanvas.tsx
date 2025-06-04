import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Grid, Info } from 'lucide-react';
import { LLMResponse, WordInfo } from "@/types";

interface WordCard {
  id: string;
  word: string;
  info: WordInfo;
  x: number;
  y: number;
  isExpanded: boolean;
  color: string;
}

interface Relationship {
  from: string;
  to: string;
}

interface SentenceCanvasProps {
  data: LLMResponse;
  title: string;
  sentence: string;
}

// Add color generation function
const generateColor = (index: number) => {
  const colors = [
    'bg-blue-100/70',
    'bg-green-100/70',
    'bg-yellow-100/70',
    'bg-purple-100/70',
    'bg-pink-100/70',
    'bg-indigo-100/70',
    'bg-orange-100/70',
    'bg-teal-100/70'
  ];
  return colors[index % colors.length];
};

export default function SentenceCanvas({ data, title, sentence }: SentenceCanvasProps) {
  const [cards, setCards] = useState<WordCard[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [relatedWords, setRelatedWords] = useState<Set<string>>(new Set());
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // For animated dashed lines
  const [dashOffset, setDashOffset] = useState(0);
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setDashOffset((prev) => (prev + 0.5) % 12); // 12 = dash+gap length, slower
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Initialize cards without colors
  useEffect(() => {
    if (!containerRef.current || !data?.result?.sentence) {
      return;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    const words = Object.entries(data.result.sentence).sort((a, b) => Number(a[1].position) - Number(b[1].position));
    const matrix = data.result.relationship_matrix;
    const n = words.length;
    
    const isMobile = window.innerWidth < 640;
    
    // Calculate card dimensions based on container size and number of words
    let cardWidth: number, cardHeight: number, spacing: number;
    
    if (isMobile) {
      // For mobile, calculate based on container height
      const maxHeight = containerHeight * 0.8; // Use 80% of container height
      cardHeight = Math.min(80, maxHeight / n - 10); // 10px spacing between cards
      cardWidth = Math.min(150, containerWidth * 0.9); // 90% of container width
      spacing = 10;
    } else {
      // For desktop, calculate based on container width and number of words
      const maxWidth = containerWidth * 0.95; // Use 95% of container width
      const minCardWidth = 120; // Minimum card width
      const maxCardWidth = 200; // Maximum card width
      
      // Calculate optimal card width based on number of words
      const optimalWidth = maxWidth / n;
      cardWidth = Math.min(maxCardWidth, Math.max(minCardWidth, optimalWidth - 20));
      
      // Calculate spacing to distribute cards evenly
      const totalCardsWidth = cardWidth * n;
      spacing = Math.max(20, (maxWidth - totalCardsWidth) / (n - 1));
      
      cardHeight = Math.min(100, containerHeight * 0.8); // 80% of container height
    }

    if (isMobile) {
      // Vertical layout for mobile
      const startY = 20; // Start from top with some padding
      const centerX = containerWidth / 2;

      const initialCards = words.map(([word, info], index) => ({
        id: word,
        word,
        info,
        x: centerX,
        y: startY + (index * (cardHeight + spacing)),
        isExpanded: false,
        color: 'bg-white dark:bg-gray-800'
      }));

      setCards(initialCards);

      // Create relationships between adjacent words in sequence (vertical)
      const newRelationships: Relationship[] = [];
      for (let i = 0; i < n - 1; i++) {
        newRelationships.push({
          from: words[i][0],
          to: words[i + 1][0]
        });
      }
      
      setRelationships(newRelationships);
    } else {
      // Horizontal layout for desktop
      const totalWidth = (cardWidth * n) + (spacing * (n - 1));
      const startX = (containerWidth - totalWidth) / 2;
      const centerY = containerHeight / 2;

      const initialCards = words.map(([word, info], index) => ({
        id: word,
        word,
        info,
        x: startX + (index * (cardWidth + spacing)) + (cardWidth / 2),
        y: centerY,
        isExpanded: false,
        color: 'bg-white dark:bg-gray-800'
      }));

      setCards(initialCards);

      // Create relationships between adjacent words in sequence (horizontal)
      const newRelationships: Relationship[] = [];
      for (let i = 0; i < n - 1; i++) {
        newRelationships.push({
          from: words[i][0],
          to: words[i + 1][0]
        });
      }
      
      setRelationships(newRelationships);
    }
  }, [data]);

  // Update canvas size when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      setCanvasSize({ width, height });

      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Set canvas size with device pixel ratio for sharp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale(prev => Math.max(0.5, Math.min(2, prev + delta)));
    }
  };

  // Handle mouse panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Handle touch panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - panStart.x;
      const dy = touch.clientY - panStart.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  // Handle card expansion
  const toggleCardExpansion = (cardId: string) => {
    setCards(cards.map(card => 
      card.id === cardId ? { ...card, isExpanded: !card.isExpanded } : card
    ));
  };

  // Draw arrows
  useEffect(() => {
    if (!canvasRef.current || !data?.result?.relationship_matrix) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#374151' : '#e5e7eb';
    ctx.globalAlpha = window.matchMedia('(prefers-color-scheme: dark)').matches ? 0.2 : 0.1; // Lighter grid
    ctx.lineWidth = 1;
    const gridSize = 20;

    // Scale the grid size by the current zoom level
    const scaledGridSize = gridSize * scale;

    for (let x = 0; x < canvas.width; x += scaledGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += scaledGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Reset alpha for arrows
    ctx.globalAlpha = 1;

    // Draw arrows between related words
    relationships.forEach(rel => {
      const sourceEl = cardRefs.current.get(rel.from);
      const targetEl = cardRefs.current.get(rel.to);
      
      if (!sourceEl || !targetEl) return;

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (!containerRect) return;

      // Calculate positions relative to container
      const sourceX = sourceRect.right - containerRect.left;
      const sourceY = sourceRect.top + sourceRect.height / 2 - containerRect.top;
      const targetX = targetRect.left - containerRect.left;
      const targetY = targetRect.top + targetRect.height / 2 - containerRect.top;

      // Draw the line with angles
      ctx.beginPath();
      ctx.setLineDash([6, 6]); // Dotted/dashed line
      ctx.lineDashOffset = -dashOffset;
      
      // Start at right center of from card
      ctx.moveTo(sourceX, sourceY);
      
      // Draw horizontal segment to align with toX
      ctx.lineTo(targetX, sourceY);
      
      // Draw vertical segment to toY
      ctx.lineTo(targetX, targetY);
      
      ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#6b7280' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid
    });
  }, [cards, relationships, canvasSize, scale, dashOffset]);

  // Remove the duplicate drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.width || !canvasSize.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw grid
    ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#374151' : '#e5e7eb';
    ctx.globalAlpha = window.matchMedia('(prefers-color-scheme: dark)').matches ? 0.2 : 0.1; // Lighter grid
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < canvasSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvasSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [canvasSize]);

  // Function to find related words
  const findRelatedWords = (wordId: string) => {
    const words = Object.entries(data?.result?.sentence || {}).sort((a, b) => Number(a[1].position) - Number(b[1].position));
    const matrix = data?.result?.relationship_matrix;
    const n = words.length;
    
    const related = new Set<string>();
    const wordIndex = words.findIndex(([w]) => w === wordId);
    
    if (wordIndex === -1 || !matrix) return related;
    
    // Add the selected word
    related.add(wordId);
    
    // Check relationships with all other words
    for (let i = 0; i < n; i++) {
      const is2DMatrix = matrix.length > 0 && Array.isArray(matrix[0]);
      const hasRelationship = is2DMatrix
        ? ((matrix as unknown) as number[][])[wordIndex][i] === 1
        : ((matrix as unknown) as number[])[wordIndex * n + i] === 1;
      
      if (hasRelationship) {
        related.add(words[i][0]);
      }
    }
    
    return related;
  };

  // Handle card selection
  const handleCardSelect = (cardId: string) => {
    if (selectedCard === cardId) {
      setSelectedCard(null);
      setRelatedWords(new Set());
      setCards(cards.map(card => ({
        ...card,
        color: 'bg-white dark:bg-gray-800' // Fully opaque background
      })));
    } else {
      const related = findRelatedWords(cardId);
      setSelectedCard(cardId);
      setRelatedWords(related);
      setCards(cards.map(card => ({
        ...card,
        color: card.id === cardId 
          ? 'bg-blue-100 dark:bg-blue-900' // Selected card
          : related.has(card.id)
            ? 'bg-red-100 dark:bg-blue-500' // Related words
            : 'bg-white dark:bg-gray-800' // Default state
      })));
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        width={canvasSize.width}
        height={canvasSize.height}
      />
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {cards.map((card) => {
          // Extract the word from the key (remove position suffix)
          const word = card.word.split('_')[0];
          return (
            <motion.div
              key={card.id}
              ref={(el) => {
                if (el) cardRefs.current.set(card.id, el);
              }}
              className="absolute"
              style={{
                left: card.x - 75,
                top: card.y - 50,
                transform: `scale(${scale})`,
              }}
              drag
              dragMomentum={false}
              dragElastic={0}
              dragConstraints={{
                left: -card.x + 75,
                right: canvasSize.width - card.x - 75,
                top: -card.y + 50,
                bottom: canvasSize.height - card.y - 50
              }}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card 
                      className={`w-[150px] sm:w-[200px] shadow-lg hover:shadow-xl transition-shadow ${
                        selectedCard === card.id ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                      } ${card.color}`}
                      onClick={() => handleCardSelect(card.id)}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-base sm:text-lg font-bold dark:text-gray-100">{word}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCardExpansion(card.id);
                            }}
                          >
                            <Info className="h-4 w-4 dark:text-gray-400" />
                          </Button>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                          {card.info.part_of_speech}
                        </p>
                        {card.isExpanded && (
                          <div className="mt-2 space-y-1">
                            {card.info.root && card.info.root !== word && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Root: {card.info.root}
                              </p>
                            )}
                            {card.info.gender && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Gender: {card.info.gender}
                              </p>
                            )}
                            {card.info.verb_tense && (
                              <>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                  Tense: {card.info.verb_tense}
                                </p>
                                {card.info.verb_tense_components && (
                                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    Components: {Array.isArray(card.info.verb_tense_components) 
                                      ? card.info.verb_tense_components.join(', ')
                                      : card.info.verb_tense_components}
                                  </p>
                                )}
                              </>
                            )}
                            {card.info.noun_case && (
                              <>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                  Case: {card.info.noun_case}
                                </p>
                                {card.info.noun_case_components && (
                                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    Case Components: {card.info.noun_case_components}
                                  </p>
                                )}
                              </>
                            )}
                            {card.info.noun_components?.affixes && (
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Affixes: {card.info.noun_components.affixes}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="dark:bg-gray-800 dark:text-gray-100">
                    <p>Position: {card.info.position + 1}</p>
                    {card.info.root && <p>Root: {card.info.root}</p>}
                    <p>Part of Speech: {card.info.part_of_speech}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
} 