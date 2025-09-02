import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Read the system prompt from prompt.txt
const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'app/api/process-sentence/prompt.txt'), 'utf-8');

interface WordAnalysis {
  text: string;
  position: number;
  part_of_speech: string;
  root: string;
  gender?: string;
  morphology?: {
    noun_components?: string[];
    noun_case?: string;
    case_markers?: string;
    verb_tense?: string;
    tense_markers?: string[];
  };
}

interface LLMResponse {
  sentence: string;
  words: WordAnalysis[];
  dependency_matrix: number[][];
}

export async function POST(req: NextRequest) {
  try {
    const { sentence } = await req.json();
    if (!sentence) {
      return NextResponse.json({ error: 'No sentence provided' }, { status: 400 });
    }

    // Add deprecation warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  DEPRECATION WARNING: /api/process-sentence is deprecated. Use /api/grammario/analyze instead.');
    }
    // Compose the prompt for the LLM
    const userPrompt = `Sentence: "${sentence}"
Please break down the sentence as described.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message?.content?.trim() || '';
    
    // Log the raw response to server console
    console.log('\n=== New LLM Response ===');
    console.log('Sentence:', sentence);
    console.log('Raw Response:', raw);
    console.log('=====================\n');

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('LLM raw output:', raw);
      return NextResponse.json({ error: 'No JSON found in LLM response', raw: raw }, { status: 400 });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]) as LLMResponse;
      
      // Transform the response to match the frontend's expected format
      const transformedResponse = {
        result: {
          sentence: {} as Record<string, any>,
          relationship_matrix: parsed.dependency_matrix || []
        }
      };

      // Convert words array to sentence object
      if (parsed.words && Array.isArray(parsed.words)) {
        parsed.words.forEach((word: WordAnalysis) => {
          // Create a unique key using both the word and its position
          const key = `${word.text}_${word.position}`;
          const wordInfo = {
            position: word.position,
            part_of_speech: word.part_of_speech,
            root: word.root,
            gender: word.gender || null,
            noun_components: {
              affixes: word.morphology?.noun_components?.[0] || null
            },
            noun_case: word.morphology?.noun_case || null,
            noun_case_components: word.morphology?.case_markers || null,
            verb_tense: word.morphology?.verb_tense || null,
            verb_tense_components: word.morphology?.tense_markers || null
          };
          transformedResponse.result.sentence[key] = wordInfo;
        });
      }
      
      // Validate the transformed response
      if (Object.keys(transformedResponse.result.sentence).length === 0) {
        throw new Error('No words were processed in the response');
      }

      return NextResponse.json({ result: transformedResponse });
    } catch (err) {
      console.error('Error processing LLM response:', err);
      return NextResponse.json({ error: 'Invalid JSON from LLM', raw: raw }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

