/**
 * PineScript Parser
 * 
 * Parses PineScript files to extract key information such as:
 * - Indicator/strategy name and description
 * - Input parameters and their types
 * - Study properties
 * - Core logic and calculations
 */

export interface PineScriptInput {
  name: string;
  type: 'input' | 'source' | 'integer' | 'float' | 'bool' | 'string' | 'color' | 'time';
  defval: any;
  minval?: number;
  maxval?: number;
  options?: string[];
  description?: string;
}

export interface PineScriptMetadata {
  name: string;
  description: string;
  overlay: boolean;
  version: string;
  author?: string;
  source?: string;
}

export interface ParsedPineScript {
  metadata: PineScriptMetadata;
  inputs: PineScriptInput[];
  logic: string;
  plotStatements: string[];
  fullSource: string;
  functions: string[];
  errors?: string[];
}

/**
 * Parses a PineScript indicator or strategy file
 */
export function parsePineScript(source: string): ParsedPineScript {
  try {
    const result: ParsedPineScript = {
      metadata: {
        name: 'Unknown Indicator',
        description: '',
        overlay: false,
        version: '1',
      },
      inputs: [],
      logic: '',
      plotStatements: [],
      fullSource: source,
      functions: [],
      errors: [],
    };

    // Normalize line endings
    const normalizedSource = source.replace(/\r\n/g, '\n');
    const lines = normalizedSource.split('\n');

    // Extract study properties
    const studyPropsRegex = /study\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"](.*)\)/;
    const strategyPropsRegex = /strategy\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"](.*)\)/;
    
    for (const line of lines) {
      // Match study or strategy definition
      const studyMatch = line.match(studyPropsRegex);
      const strategyMatch = line.match(strategyPropsRegex);
      
      if (studyMatch || strategyMatch) {
        const match = studyMatch || strategyMatch;
        if (!match) continue;
        
        result.metadata.name = match[1];
        result.metadata.description = match[2];
        
        // Parse additional properties like overlay
        const additionalProps = match[3] || '';
        
        if (additionalProps.includes('overlay=true')) {
          result.metadata.overlay = true;
        }
        
        // Extract version if available
        const versionMatch = additionalProps.match(/version\s*=\s*['"]([^'"]+)['"]/);
        if (versionMatch) {
          result.metadata.version = versionMatch[1];
        }
      }
    }

    // Extract input parameters
    const inputRegex = /input\s+(\w+)\s*=\s*(input\.\w+)\(([^)]*)\)/g;
    const simpleInputRegex = /input\s+(\w+)\s*=\s*([^,\s]+)\s*,\s*['"]([^'"]+)['"]\s*,/;
    
    let match;
    while ((match = inputRegex.exec(source)) !== null) {
      try {
        const name = match[1];
        const typeStr = match[2]; // Like input.integer, input.source, etc.
        const paramsStr = match[3]; // Parameters inside parentheses
        
        // Extract type
        const type = typeStr.split('.')[1] as any;
        
        // Parse parameters
        const defvalMatch = paramsStr.match(/defval\s*=\s*([^,\)]+)/);
        const minvalMatch = paramsStr.match(/minval\s*=\s*([^,\)]+)/);
        const maxvalMatch = paramsStr.match(/maxval\s*=\s*([^,\)]+)/);
        const titleMatch = paramsStr.match(/title\s*=\s*['"]([^'"]+)['"]/);
        
        const input: PineScriptInput = {
          name,
          type,
          defval: defvalMatch ? parseInputValue(defvalMatch[1], type) : undefined,
          description: titleMatch ? titleMatch[1] : undefined
        };
        
        if (minvalMatch) input.minval = parseFloat(minvalMatch[1]);
        if (maxvalMatch) input.maxval = parseFloat(maxvalMatch[1]);
        
        // Extract options for input.source
        if (type === 'source') {
          const optionsMatch = paramsStr.match(/options\s*=\s*\[(.*?)\]/);
          if (optionsMatch) {
            input.options = optionsMatch[1]
              .split(',')
              .map(o => o.trim().replace(/['"]/g, ''));
          }
        }
        
        result.inputs.push(input);
      } catch (err) {
        result.errors?.push(`Error parsing input: ${match[0]}`);
      }
    }

    // Extract plot statements
    const plotRegex = /plot\((.*?)\)/g;
    while ((match = plotRegex.exec(source)) !== null) {
      result.plotStatements.push(match[0]);
    }

    // Extract function definitions
    const functionRegex = /(?:export\s+)?(?:method\s+)?(?:function|f)\s+(\w+)\s*\([^\)]*\)\s*=>\s*(?:{[\s\S]*?}|[^\n]*)/g;
    while ((match = functionRegex.exec(source)) !== null) {
      result.functions.push(match[1]);
    }

    // Extract main logic - everything between the last input and the first plot
    // This is a simplification and might need refinement for complex scripts
    const lastInputIndex = source.lastIndexOf('input');
    const firstPlotIndex = source.indexOf('plot(');
    
    if (lastInputIndex !== -1 && firstPlotIndex !== -1 && lastInputIndex < firstPlotIndex) {
      // Find the line after the last input
      const subSource = source.substring(lastInputIndex);
      const nextLineIndex = subSource.indexOf('\n') + 1;
      
      result.logic = source.substring(
        lastInputIndex + nextLineIndex, 
        firstPlotIndex
      ).trim();
    }

    return result;
  } catch (error) {
    console.error('Error parsing PineScript:', error);
    return {
      metadata: {
        name: 'Parse Error',
        description: 'Failed to parse PineScript file',
        overlay: false,
        version: '1',
      },
      inputs: [],
      logic: '',
      plotStatements: [],
      fullSource: source,
      functions: [],
      errors: [(error as Error).message],
    };
  }
}

/**
 * Parse an input value based on its type
 */
function parseInputValue(value: string, type: string): any {
  value = value.trim();
  
  switch (type) {
    case 'integer':
    case 'float':
      return parseFloat(value);
    case 'bool':
      return value.toLowerCase() === 'true';
    case 'string':
      return value.replace(/['"]/g, '');
    case 'color':
      // Handle color syntax like color.red, #FF0000, etc.
      return value;
    default:
      return value;
  }
}
