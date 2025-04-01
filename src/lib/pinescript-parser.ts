/**
 * PineScript Parser
 * 
 * This module parses PineScript code to extract indicators, entry rules, and exit rules
 * for integration with the Trading Farm platform.
 */

export interface PineScriptIndicator {
  name: string;
  parameters: Record<string, any>;
  code: string;
}

export interface PineScriptRule {
  condition: string;
  description: string;
  code: string;
}

export interface ParsedPineScript {
  indicators: PineScriptIndicator[];
  entryRules: PineScriptRule[];
  exitRules: PineScriptRule[];
  variables: Record<string, any>;
  metadata: {
    version: string;
    author?: string;
    description?: string;
  };
}

class PineScriptParser {
  private code: string = '';
  private lines: string[] = [];

  /**
   * Parse PineScript code to extract indicators and trading rules
   */
  parse(code: string): ParsedPineScript {
    this.code = code;
    this.lines = code.split('\n');
    
    const result: ParsedPineScript = {
      indicators: [],
      entryRules: [],
      exitRules: [],
      variables: {},
      metadata: {
        version: this.extractVersion(),
      }
    };
    
    // Extract metadata
    result.metadata.description = this.extractDescription();
    result.metadata.author = this.extractAuthor();
    
    // Extract indicators
    result.indicators = this.extractIndicators();
    
    // Extract variables
    result.variables = this.extractVariables();
    
    // Extract entry and exit rules
    const rules = this.extractRules();
    result.entryRules = rules.entryRules;
    result.exitRules = rules.exitRules;
    
    return result;
  }

  /**
   * Extract PineScript version from the code
   */
  private extractVersion(): string {
    const versionLine = this.lines.find(line => line.trim().startsWith('//@version'));
    if (versionLine) {
      const versionMatch = versionLine.match(/\/\/@version\s*=\s*(\d+)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    }
    return 'unknown';
  }

  /**
   * Extract script description from comments
   */
  private extractDescription(): string {
    const descriptionComments: string[] = [];
    let inCommentBlock = false;
    
    for (const line of this.lines) {
      const trimmedLine = line.trim();
      
      // Multi-line comment block
      if (trimmedLine.startsWith('/*')) {
        inCommentBlock = true;
        // Extract text after /*
        const text = trimmedLine.substring(2).trim();
        if (text && !text.startsWith('@')) {
          descriptionComments.push(text);
        }
        continue;
      }
      
      if (inCommentBlock) {
        if (trimmedLine.endsWith('*/')) {
          inCommentBlock = false;
          // Extract text before */
          const text = trimmedLine.substring(0, trimmedLine.length - 2).trim();
          if (text && !text.startsWith('@')) {
            descriptionComments.push(text);
          }
        } else {
          // Inside comment block
          if (trimmedLine && !trimmedLine.startsWith('@')) {
            descriptionComments.push(trimmedLine);
          }
        }
        continue;
      }
      
      // Single line comment for description
      if (trimmedLine.startsWith('//') && !trimmedLine.startsWith('//@')) {
        const commentText = trimmedLine.substring(2).trim();
        if (commentText) {
          descriptionComments.push(commentText);
        }
      }
      
      // Stop collecting comments once we hit actual code
      if (!trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*') && trimmedLine.length > 0) {
        break;
      }
    }
    
    return descriptionComments.join(' ').trim();
  }

  /**
   * Extract author information from comments
   */
  private extractAuthor(): string | undefined {
    const authorLine = this.lines.find(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//@author') || trimmed.includes('@author');
    });
    
    if (authorLine) {
      const authorMatch = authorLine.match(/\@author\s*=?\s*(.+)/);
      return authorMatch ? authorMatch[1].trim() : undefined;
    }
    
    return undefined;
  }

  /**
   * Extract indicator definitions from the code
   */
  private extractIndicators(): PineScriptIndicator[] {
    const indicators: PineScriptIndicator[] = [];
    
    // Find indicator functions and variables
    const indicatorPatterns = [
      /(\w+)\s*=\s*ta\.([a-zA-Z0-9_]+)\s*\((.*)\)/g,  // Assignment of technical indicator
      /(\w+)\s*=\s*([a-zA-Z0-9_]+)\s*\((.*)\)/g,      // Generic function call assignment
      /([a-zA-Z0-9_]+)\s*\((.*)\)/g                   // Standalone function calls
    ];
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Skip comments and empty lines
      if (line.startsWith('//') || line.length === 0) continue;
      
      for (const pattern of indicatorPatterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex state
        
        while ((match = pattern.exec(line)) !== null) {
          const name = match[1];
          const functionName = match[2] || match[1]; // Handle different regex groups
          const paramsText = match[match.length - 1]; // Last group contains parameters
          
          // Basic parameter parsing (this could be enhanced)
          const params = this.parseParameters(paramsText);
          
          indicators.push({
            name,
            parameters: params,
            code: line
          });
        }
      }
      
      // Look for plot statements which usually indicate indicators
      if (line.includes('plot(') || line.includes('hline(') || line.includes('fill(')) {
        const plotMatch = line.match(/plot\s*\(\s*([^,)]+)/);
        if (plotMatch) {
          const plotVar = plotMatch[1].trim();
          indicators.push({
            name: plotVar,
            parameters: {},
            code: line
          });
        }
      }
    }
    
    return indicators;
  }

  /**
   * Extract variable definitions
   */
  private extractVariables(): Record<string, any> {
    const variables: Record<string, any> = {};
    
    for (const line of this.lines) {
      const trimmedLine = line.trim();
      
      // Skip comments
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) continue;
      
      // Look for variable assignments
      const varMatch = trimmedLine.match(/(\w+)\s*=\s*(.+)/);
      if (varMatch) {
        const varName = varMatch[1];
        const varValue = varMatch[2].split('//')[0].trim(); // Remove inline comments
        
        // Skip if it's a function or complex expression
        if (!varValue.includes('function(') && !varValue.includes('=>')) {
          try {
            // Try to evaluate simple numeric values and booleans
            if (varValue === 'true') {
              variables[varName] = true;
            } else if (varValue === 'false') {
              variables[varName] = false;
            } else if (!isNaN(Number(varValue))) {
              variables[varName] = Number(varValue);
            } else {
              // Store as string
              variables[varName] = varValue;
            }
          } catch {
            // If evaluation fails, store as string
            variables[varName] = varValue;
          }
        }
      }
      
      // Look for input variables
      const inputMatch = trimmedLine.match(/(\w+)\s*=\s*input\.([\w]+)\s*\((.*)\)/);
      if (inputMatch) {
        const varName = inputMatch[1];
        const inputType = inputMatch[2];
        const inputArgs = this.parseParameters(inputMatch[3]);
        
        if (inputArgs.defval !== undefined) {
          variables[varName] = {
            type: inputType,
            defaultValue: inputArgs.defval,
            title: inputArgs.title,
            options: inputArgs.options
          };
        }
      }
    }
    
    return variables;
  }

  /**
   * Extract entry and exit rules
   */
  private extractRules(): { entryRules: PineScriptRule[], exitRules: PineScriptRule[] } {
    const entryRules: PineScriptRule[] = [];
    const exitRules: PineScriptRule[] = [];
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      
      // Look for strategy.entry and strategy.exit calls
      if (line.includes('strategy.entry')) {
        const entryMatch = line.match(/strategy\.entry\s*\((.*)\)/);
        if (entryMatch) {
          const params = this.parseParameters(entryMatch[1]);
          let condition = 'true'; // Default condition
          
          // Look for condition in the previous line
          if (i > 0) {
            const prevLine = this.lines[i-1].trim();
            if (prevLine.includes('if') && prevLine.includes('then')) {
              const condMatch = prevLine.match(/if\s+(.*?)\s+then/);
              if (condMatch) {
                condition = condMatch[1];
              }
            }
          }
          
          entryRules.push({
            condition,
            description: params.id || 'Entry signal',
            code: line
          });
        }
      }
      
      if (line.includes('strategy.exit')) {
        const exitMatch = line.match(/strategy\.exit\s*\((.*)\)/);
        if (exitMatch) {
          const params = this.parseParameters(exitMatch[1]);
          let condition = 'true'; // Default condition
          
          // Look for condition in the previous line
          if (i > 0) {
            const prevLine = this.lines[i-1].trim();
            if (prevLine.includes('if') && prevLine.includes('then')) {
              const condMatch = prevLine.match(/if\s+(.*?)\s+then/);
              if (condMatch) {
                condition = condMatch[1];
              }
            }
          }
          
          exitRules.push({
            condition,
            description: params.id || 'Exit signal',
            code: line
          });
        }
      }
      
      // Check for conditional long/short entries
      if (line.includes('if') && (line.includes('strategy.entry') || line.includes('strategy.exit'))) {
        const ifMatch = line.match(/if\s+(.*?)\s+then\s+(.*)/);
        if (ifMatch) {
          const condition = ifMatch[1];
          const action = ifMatch[2];
          
          if (action.includes('strategy.entry')) {
            entryRules.push({
              condition,
              description: 'Conditional entry',
              code: line
            });
          } else if (action.includes('strategy.exit')) {
            exitRules.push({
              condition,
              description: 'Conditional exit',
              code: line
            });
          }
        }
      }
    }
    
    return { entryRules, exitRules };
  }

  /**
   * Parse parameters string into an object
   */
  private parseParameters(paramsText: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (!paramsText) return params;
    
    // Handle nested brackets and quotes
    let buffer = '';
    let inQuote = false;
    let bracketCount = 0;
    let currentParam = '';
    
    for (let i = 0; i < paramsText.length; i++) {
      const char = paramsText[i];
      
      if (char === '"' && paramsText[i-1] !== '\\') {
        inQuote = !inQuote;
      }
      
      if (!inQuote) {
        if (char === '(') bracketCount++;
        if (char === ')') bracketCount--;
      }
      
      if (char === ',' && bracketCount === 0 && !inQuote) {
        // Process the parameter
        this.processParam(buffer, params);
        buffer = '';
        continue;
      }
      
      buffer += char;
    }
    
    // Process the last parameter
    if (buffer.trim()) {
      this.processParam(buffer, params);
    }
    
    return params;
  }

  /**
   * Process a single parameter and add it to the params object
   */
  private processParam(param: string, params: Record<string, any>): void {
    param = param.trim();
    
    // Handle named parameters (param=value)
    const namedMatch = param.match(/(\w+)\s*=\s*(.*)/);
    if (namedMatch) {
      const paramName = namedMatch[1].trim();
      let paramValue: any = namedMatch[2].trim();
      
      // Convert to appropriate type
      if (paramValue === 'true') {
        paramValue = true;
      } else if (paramValue === 'false') {
        paramValue = false;
      } else if (!isNaN(Number(paramValue))) {
        paramValue = Number(paramValue);
      } else if (paramValue.startsWith('"') && paramValue.endsWith('"')) {
        // Remove quotes from string
        paramValue = paramValue.substring(1, paramValue.length - 1);
      }
      
      params[paramName] = paramValue;
    } else {
      // Handle positional parameters by using index as key
      const index = Object.keys(params).length;
      params[`param${index}`] = param;
    }
  }
}

/**
 * Create a new instance of the PineScript parser
 */
export function createPineScriptParser(): PineScriptParser {
  return new PineScriptParser();
} 