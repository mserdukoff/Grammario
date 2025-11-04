import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logError, logAdminCall } from '@/lib/error-logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VocabularyRequest {
  word: string;
  language: string;
  partOfSpeech: string;
  root?: string;
}

interface VocabularyResponse {
  word: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  related: string[];
  derivatives: string[];
  examples: string[];
  frequency?: 'common' | 'uncommon' | 'rare';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

const VOCABULARY_PROMPT = `You are a vocabulary assistant that provides comprehensive word information for language learners. Given a word in a specific language, provide detailed vocabulary expansion data.

Your output must be ONLY a JSON object with this exact structure:

{
  "word": "<the input word>",
  "definition": "<simple English equivalent>",
  "synonyms": ["<synonym1>", "<synonym2>", ...],
  "antonyms": ["<antonym1>", "<antonym2>", ...],
  "related": ["<related_word1>", "<related_word2>", ...],
  "derivatives": ["<derivative1>", "<derivative2>", ...],
  "examples": ["<example_sentence1>", "<example_sentence2>", ...],
  "frequency": "<common|uncommon|rare>",
  "difficulty": "<beginner|intermediate|advanced>"
}

CRITICAL REQUIREMENTS:
1. **Definition**: Must be a simple, direct English equivalent or translation (1-3 words maximum)
2. **Synonyms/Antonyms/Related/Derivatives**: Keep these in the SOURCE LANGUAGE (same language as the input word)
3. **Examples**: Provide sentences in the SOURCE LANGUAGE that show different contexts of usage
4. **Frequency**: Based on how commonly the word is used in everyday speech
5. **Difficulty**: Assess learning difficulty for language students (beginner/intermediate/advanced)

Guidelines:
- Provide 3-5 synonyms in the source language if they exist
- Provide 2-3 antonyms in the source language if they exist  
- Include 3-5 related words in the source language (same semantic field)
- Include 3-5 word family derivatives in the source language (different forms, compounds)
- Provide 3-4 example sentences in the source language showing different contexts
- If few results exist for a category, provide what's available
- Ensure examples are natural and educational

STRICT RULES:
- Output ONLY valid JSON
- No explanatory text outside JSON
- All arrays must contain strings
- Examples must be complete sentences in the source language
- Definition must be a simple English equivalent (1-3 words only)`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | null | undefined;
  let rawInput: any;
  let rawLLMOutput: any;
  
  try {
    const requestBody = await req.json();
    const { word, language, partOfSpeech, root, userId: requestUserId }: VocabularyRequest & { userId?: string } = requestBody;
    userId = requestUserId || null;
    rawInput = { word, language, partOfSpeech, root, userId };
    
    if (!word || !language) {
      const duration = Date.now() - startTime;
      await logAdminCall({
        endpoint: '/api/vocabulary-expand',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        statusCode: 400,
        duration,
        error: { message: 'Word and language are required' },
      }).catch(() => {});
      return NextResponse.json({ error: 'Word and language are required' }, { status: 400 });
    }

    const userPrompt = `Word: "${word}"
Language: ${language}
Part of Speech: ${partOfSpeech}
${root ? `Root/Lemma: ${root}` : ''}

Provide comprehensive vocabulary expansion data for this word.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: VOCABULARY_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0].message?.content?.trim() || '';
    rawLLMOutput = completion;

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in LLM response:', raw);
      const duration = Date.now() - startTime;
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/vocabulary-expand',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode: 500,
        duration,
        error: { message: 'No JSON found in LLM response' },
      }).catch(() => {});
      
      // Log error with full LLM response
      await logError({
        error: new Error('No JSON found in LLM response'),
        endpoint: '/api/vocabulary-expand',
        requestData: { word, language, partOfSpeech, root },
        fullLLMResponse: raw,
        httpStatus: 500,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
      return NextResponse.json({ error: 'Invalid response format', raw }, { status: 500 });
    }

    let vocabularyData: VocabularyResponse;
    try {
      vocabularyData = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('JSON parse error:', err);
      const duration = Date.now() - startTime;
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/vocabulary-expand',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode: 500,
        duration,
        error: err instanceof Error ? err : { message: String(err) },
      }).catch(() => {});
      
      // Log error with full faulty LLM response
      await logError({
        error: err instanceof Error ? err : new Error(String(err)),
        endpoint: '/api/vocabulary-expand',
        requestData: { word, language, partOfSpeech, root },
        fullLLMResponse: raw,
        httpStatus: 500,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(logErr => console.error('Failed to log error:', logErr));
      
      return NextResponse.json({ error: 'Invalid JSON response', raw }, { status: 500 });
    }

    // Validate required fields
    if (!vocabularyData.word || !vocabularyData.definition) {
      const duration = Date.now() - startTime;
      
      // Log to admin_logs
      await logAdminCall({
        endpoint: '/api/vocabulary-expand',
        method: 'POST',
        userId: userId || null,
        userAgent: req.headers.get('user-agent') || undefined,
        rawInput: rawInput,
        rawLLMOutput: rawLLMOutput,
        statusCode: 500,
        duration,
        error: { message: 'Incomplete vocabulary data' },
      }).catch(() => {});
      
      // Log validation error with LLM response
      await logError({
        error: new Error('Incomplete vocabulary data'),
        endpoint: '/api/vocabulary-expand',
        requestData: { word, language, partOfSpeech, root },
        fullLLMResponse: raw,
        httpStatus: 500,
        userAgent: req.headers.get('user-agent') || undefined,
      }).catch(err => console.error('Failed to log error:', err));
      
      return NextResponse.json({ error: 'Incomplete vocabulary data' }, { status: 500 });
    }

    // Ensure arrays exist (even if empty)
    vocabularyData.synonyms = vocabularyData.synonyms || [];
    vocabularyData.antonyms = vocabularyData.antonyms || [];
    vocabularyData.related = vocabularyData.related || [];
    vocabularyData.derivatives = vocabularyData.derivatives || [];
    vocabularyData.examples = vocabularyData.examples || [];

    const duration = Date.now() - startTime;
    
    // Log successful request to admin_logs
    await logAdminCall({
      endpoint: '/api/vocabulary-expand',
      method: 'POST',
      userId: userId || null,
      userAgent: req.headers.get('user-agent') || undefined,
      rawInput: rawInput,
      rawLLMOutput: rawLLMOutput,
      responseData: vocabularyData,
      statusCode: 200,
      duration,
    }).catch(() => {});

    return NextResponse.json(vocabularyData);

  } catch (error: any) {
    console.error('Vocabulary expansion API error:', error);
    const duration = Date.now() - startTime;
    
    // Log to admin_logs
    await logAdminCall({
      endpoint: '/api/vocabulary-expand',
      method: 'POST',
      userId: userId || null,
      userAgent: req.headers.get('user-agent') || undefined,
      rawInput: rawInput,
      rawLLMOutput: rawLLMOutput,
      statusCode: 500,
      duration,
      error: error,
    }).catch(() => {});
    
    // Log error
    await logError({
      error: error,
      endpoint: '/api/vocabulary-expand',
      httpStatus: 500,
      userAgent: req.headers.get('user-agent') || undefined,
    }).catch(logErr => console.error('Failed to log error:', logErr));
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
