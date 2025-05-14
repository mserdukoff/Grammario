import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize, Grid, Info } from 'lucide-react';

interface WordInfo {
  position: number;
  part_of_speech: string;
  root: string | null;
  noun_components: {
    affixes: string | null;
  };
  noun_case: string | null;
  noun_case_components: string | null;
  verb_tense: string | null;
  verb_tense_components: string[] | null;
}

interface LLMResponse {
  result: {
    sentence: {
      [word: string]: WordInfo;
    };
    relationship_matrix: number[][];
  };
}

interface WordCard {
  id: string;
  word: string;
  info: WordInfo;
  x: number;
  y: number;
  isExpanded: boolean;
  isHighlighted: boolean;
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

export default function SentenceCanvas({ data, title, sentence }: SentenceCanvasProps) {
  const [cards, setCards] = useState<WordCard[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [relatedWords, setRelatedWords] = useState<Set<string>>(new Set());
  
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

  // Initialize cards and relationships
  useEffect(() => {
    console.log('Initialization effect running with data:', JSON.stringify(data, null, 2));
    console.log('Container ref exists:', !!containerRef.current);
    console.log('Data.result exists:', !!data?.result);
    console.log('Data.result.sentence exists:', !!data?.result?.sentence);
    console.log('Data.result.relationship_matrix exists:', !!data?.result?.relationship_matrix);

    if (!containerRef.current || !data?.result?.sentence) {
      console.log('Early return due to missing data or container');
      return;
    }

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    console.log('Container dimensions:', { width: containerWidth, height: containerHeight });

    const words = Object.entries(data.result.sentence).sort((a, b) => Number(a[1].position) - Number(b[1].position));
    console.log('Processed words:', words);

    const cardWidth = 200;
    const spacing = 50;
    const totalWidth = (words.length - 1) * (cardWidth + spacing);
    const startX = (containerWidth - totalWidth) / 2;
    const centerY = containerHeight / 2;

    const initialCards = words.map(([word, info], index) => ({
      id: word,
      word,
      info,
      x: startX + (index * (cardWidth + spacing)),
      y: centerY,
      isExpanded: false,
      isHighlighted: false
    }));
    console.log('Created initial cards:', initialCards);
    setCards(initialCards);

    // Create only sequential relationships
    const newRelationships: Relationship[] = words.slice(0, -1).map(([word], index) => ({
      from: word,
      to: words[index + 1][0]
    }));
    console.log('Created relationships:', newRelationships);
    setRelationships(newRelationships);
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

  // Handle zoom
  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(2, prev + delta * 0.1)));
  };

  // Handle card expansion
  const toggleCardExpansion = (cardId: string) => {
    setCards(cards.map(card => 
      card.id === cardId ? { ...card, isExpanded: !card.isExpanded } : card
    ));
  };

  // Handle card hover to highlight related words
  const handleCardHover = (cardId: string | null) => {
    setHoveredCard(cardId);
    
    if (!cardId || !data?.result?.relationship_matrix) {
      setRelatedWords(new Set());
      setCards(cards.map(card => ({ ...card, isHighlighted: false })));
      return;
    }

    // Find the index of the hovered card
    const cardIndex = cards.findIndex(card => card.id === cardId);
    if (cardIndex === -1) return;

    // Get related words from the relationship matrix
    const related = new Set<string>();
    const matrixRow = data.result.relationship_matrix[cardIndex];
    
    if (Array.isArray(matrixRow)) {
      matrixRow.forEach((value, index) => {
        if (value === 1) {
          related.add(cards[index].id);
        }
      });
    }

    setRelatedWords(related);
    setCards(cards.map(card => ({
      ...card,
      isHighlighted: related.has(card.id)
    })));
  };

  // Draw arrows
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSize.width || !canvasSize.height) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
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
    }

    // Draw sequential arrows (now just animated dotted lines, no arrowheads)
    relationships.forEach(rel => {
      const fromElement = cardRefs.current.get(rel.from);
      const toElement = cardRefs.current.get(rel.to);
      
      if (!fromElement || !toElement) return;

      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (!containerRect) return;

      // Start at right center of from card, end at left center of to card
      const fromX = fromRect.right - containerRect.left;
      const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
      const toX = toRect.left - containerRect.left;
      const toY = toRect.top + toRect.height / 2 - containerRect.top;

      // Arrow stub length before the card
      const stubLength = 18;
      // Draw elbow (L-shaped) connector: horizontal, then vertical, then stub
      ctx.beginPath();
      ctx.setLineDash([6, 6]); // Dotted/dashed line
      ctx.lineDashOffset = -dashOffset;
      ctx.moveTo(fromX, fromY);
      // Horizontal segment to align with toX
      ctx.lineTo(toX, fromY);
      // Vertical segment to toY
      ctx.lineTo(toX, toY);
      // Final stub before the card
      let arrowBaseX = toX;
      let arrowBaseY = toY;
      if (Math.abs(fromY - toY) < 2) {
        // Horizontal
        arrowBaseX = toX - stubLength;
        arrowBaseY = toY;
        ctx.lineTo(arrowBaseX, arrowBaseY);
      } else {
        // Vertical
        arrowBaseX = toX;
        arrowBaseY = toY - Math.sign(toY - fromY) * stubLength;
        ctx.lineTo(arrowBaseX, arrowBaseY);
      }
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid
    });
  }, [cards, relationships, canvasSize, showGrid, scale, dashOffset]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
      onWheel={(e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
        }
      }}
    >
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => handleZoom(0.1)}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowGrid(!showGrid)}>
          <Grid className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setScale(1)}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas for arrows */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 z-10 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Cards */}
      <div 
        className="relative z-10 h-full"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {cards.map((card) => (
          <motion.div
            key={card.id}
            className="absolute"
            initial={false}
            style={{ x: card.x, y: card.y }}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={containerRef}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              setCards(cards.map(c => 
                c.id === card.id ? { ...c, x: info.point.x, y: info.point.y } : c
              ));
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => handleCardHover(card.id)}
            onHoverEnd={() => handleCardHover(null)}
            ref={(el) => {
              if (el) {
                cardRefs.current.set(card.id, el);
                requestAnimationFrame(() => {
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }
                });
              }
            }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card 
                    className={`w-[200px] shadow-lg hover:shadow-xl transition-shadow ${
                      selectedCard === card.id ? 'ring-2 ring-blue-500' : ''
                    } ${card.isHighlighted ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold">{card.word}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCardExpansion(card.id);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {card.info.part_of_speech}
                      </p>
                      {card.isExpanded && (
                        <div className="mt-2 space-y-1">
                          {card.info.root && (
                            <p className="text-sm text-gray-500">
                              Root: {card.info.root}
                            </p>
                          )}
                          {card.info.verb_tense && (
                            <p className="text-sm text-gray-500">
                              Tense: {card.info.verb_tense}
                            </p>
                          )}
                          {card.info.noun_case && (
                            <p className="text-sm text-gray-500">
                              Case: {card.info.noun_case}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Position: {card.info.position + 1}</p>
                  {card.info.root && <p>Root: {card.info.root}</p>}
                  <p>Part of Speech: {card.info.part_of_speech}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 