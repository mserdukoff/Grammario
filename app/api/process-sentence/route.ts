import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Read the system prompt from prompt.txt
const SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'app/api/process-sentence/prompt.txt'), 'utf-8');

export async function POST(req: NextRequest) {
  try {
    const { sentence, language } = await req.json();
    if (!sentence) {
      return NextResponse.json({ error: 'No sentence provided' }, { status: 400 });
    }
    // Compose the prompt for the LLM
    const userPrompt = `Sentence: "${sentence}"
Language: ${language || 'unknown'}
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
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('LLM raw output:', raw);
      return NextResponse.json({ error: 'No JSON found in LLM response', raw }, { status: 400 });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid JSON from LLM', raw }, { status: 400 });
    }

    return NextResponse.json({ result: parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

