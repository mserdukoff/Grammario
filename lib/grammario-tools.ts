import { zodToJsonSchema } from "zod-to-json-schema";
import { AnalysisSchema } from "./grammario";

/** OpenAI "tools" array with a single function that returns the Analysis shape. */
export function grammarioTools() {
  // Generate schema and resolve $ref to avoid OpenAI issues
  const rawSchema = zodToJsonSchema(AnalysisSchema, { name: "Analysis" }) as any;
  
  // Extract the actual schema from definitions if using $ref
  let resolvedSchema;
  if (rawSchema.$ref && rawSchema.definitions) {
    const refName = rawSchema.$ref.replace("#/definitions/", "");
    resolvedSchema = rawSchema.definitions[refName];
  } else {
    resolvedSchema = rawSchema;
  }
  
  // Ensure we have a clean schema without $ref
  const { $schema, definitions, $ref, ...cleanSchema } = resolvedSchema;
  const params = {
    type: "object" as const,
    ...cleanSchema,
  };
  
  return [
    {
      type: "function" as const,
      function: {
        name: "analyze_sentence",
        description:
          "Return token-level grammar+morphology+syntax analysis and teaching notes",
        parameters: params,
      },
    },
  ];
}
