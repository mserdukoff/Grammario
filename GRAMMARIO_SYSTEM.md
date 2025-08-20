# Grammario Robust Prompt System

This document describes the new robust prompt system implemented for Grammario that provides type-safe, validated sentence analysis with comprehensive error handling.

## Architecture Overview

### Core Components

1. **Schema Definitions** (`lib/grammario.ts`)
   - Zod schemas for type-safe validation
   - Helper functions for data manipulation
   - Sanity checks for dependency parsing

2. **OpenAI Function Calling** (`lib/grammario-tools.ts`)
   - Auto-generated JSON Schema from Zod schemas
   - Ensures model outputs match expected format

3. **API Route** (`app/api/grammario/analyze/route.ts`)
   - Validated request/response handling
   - Comprehensive error reporting
   - Structured function calling

4. **Client Library** (`lib/grammario-client.ts`)
   - Type-safe client-side API calls
   - Built-in response validation

5. **Transformation Layer** (`lib/grammario-transform.ts`)
   - Converts new format to legacy UI format
   - Maintains backward compatibility
   - Maps linguistic abbreviations to full descriptive names
   - Ensures proper capitalization for user-friendly display
   - Extracts morphological components for detailed word analysis

## Key Features

### Type Safety
- All data structures defined with Zod schemas
- Compile-time and runtime type checking
- Auto-generated TypeScript types

### Validation
- Input validation on API requests
- Output validation on model responses
- Sanity checks for linguistic data (head indices, dependency graphs)

### Error Handling
- Structured error reporting with Zod validation errors
- Grammar errors detected by the model
- Teaching notes for language learning

### Backward Compatibility
- Transformation layer maintains existing UI compatibility
- Old API route still functional with deprecation warnings

## Data Schema

### Analysis Schema
```typescript
interface Analysis {
  language?: string;           // ISO 639-1 language code
  original_sentence: string;   // Input sentence
  normalized?: string;         // Corrected version if errors found
  tokens: Token[];            // Linguistic analysis per token
  syntax?: {                  // Dependency parsing information
    root?: number;            // 1-based root token index
    dependencies?: {          // Dependency relations
      head: number;           // 1-based head token index
      dependent: number;      // 1-based dependent token index
      relation: string;       // Dependency relation label
    }[];
  };
  errors?: ErrorItem[];       // Grammar/usage errors found
  teaching_notes?: TeachingNote[]; // Educational content
}
```

### Token Schema
```typescript
interface Token {
  text: string;              // Surface form
  lemma?: string;           // Dictionary form
  upos: string;             // Universal POS tag
  xpos?: string;            // Language-specific POS
  morphology?: {            // Morphological features (sparse)
    number?: string;
    case?: string;
    gender?: string;
    person?: string;
    tense?: string;
    aspect?: string;
    mood?: string;
    voice?: string;
    polarity?: string;
    evidentiality?: string;
    affixes?: Affix[];
  };
  gloss?: string;           // Translation/explanation
  head?: number;            // 1-based dependency head
  deprel?: string;          // Dependency relation
  explanation?: string;     // Additional notes
}
```

## Usage

### Basic Analysis
```typescript
import { analyze } from '@/lib/grammario-client';

const analysis = await analyze("Hello world", "en");
console.log(analysis.tokens); // Linguistic breakdown
console.log(analysis.errors); // Any grammar issues
console.log(analysis.teaching_notes); // Learning insights
```

### With Error Handling
```typescript
try {
  const analysis = await analyze(sentence, languageHint);
  // Process successful analysis
} catch (error) {
  if (error.message.includes('422')) {
    // Validation error - malformed model output
  } else {
    // Network or other error
  }
}
```

### Legacy Format Transformation
```typescript
import { transformAnalysisToLLMResponse } from '@/lib/grammario-transform';

const analysis = await analyze(sentence);
const legacyFormat = transformAnalysisToLLMResponse(analysis);
// Use with existing UI components
```

## API Endpoints

### New Robust Endpoint
- **URL**: `/api/grammario/analyze`
- **Method**: `POST`
- **Input**: `{ sentence: string, languageHint?: string }`
- **Output**: `Analysis` (validated)

### Legacy Endpoint (Deprecated)
- **URL**: `/api/process-sentence`
- **Method**: `POST`
- **Status**: Deprecated with console warnings
- **Migration**: Use new endpoint with transformation layer

## Error Types

### Validation Errors (422)
- Malformed model output
- Schema validation failures
- Sanity check failures (e.g., invalid dependency heads)

### Grammar Errors (200 with errors array)
- Detected by the language model
- Includes corrections and explanations
- Categorized by error type

### System Errors (500)
- Network failures
- Model unavailability
- Internal server errors

## Testing

### Schema Tests
```bash
npm test
```

Tests cover:
- Schema validation for valid inputs
- Rejection of invalid data
- Sanity checks for linguistic structures

### Manual Testing
```bash
curl -X POST http://localhost:3000/api/grammario/analyze \
  -H "Content-Type: application/json" \
  -d '{"sentence":"Hello world","languageHint":"en"}'
```

## Migration Guide

### For New Features
Use the new system directly:
```typescript
import { analyze } from '@/lib/grammario-client';
const analysis = await analyze(sentence, language);
```

### For Existing UI Components
Use the transformation layer:
```typescript
import { transformAnalysisToLLMResponse } from '@/lib/grammario-transform';
const legacyData = transformAnalysisToLLMResponse(analysis);
```

### Deprecation Timeline
1. **Phase 1**: New system deployed alongside legacy (current)
2. **Phase 2**: Update all UI components to use new format
3. **Phase 3**: Remove legacy API and transformation layer

## Benefits

1. **Reliability**: Schema validation prevents malformed responses
2. **Type Safety**: Compile-time error detection
3. **Consistency**: Standardized data structures
4. **Extensibility**: Easy to add new linguistic features
5. **Debugging**: Clear error messages and validation failures
6. **Performance**: Function calling reduces token usage vs text parsing
7. **Teaching**: Built-in error detection and educational content

## Model Prompt

The system uses a carefully crafted system prompt that:
- Enforces JSON schema compliance via function calling
- Encourages sparse morphological analysis (omit null/undefined)
- Provides clear guidelines for error detection
- Includes educational context appropriate for CEFR levels
- Handles uncertainty gracefully with minimal analysis

This robust foundation ensures consistent, validated, and educational sentence analysis for language learners.
