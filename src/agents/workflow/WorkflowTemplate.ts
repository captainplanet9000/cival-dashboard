/**
 * Represents a parameter for a workflow template.
 */
export interface WorkflowParameterDefinition {
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    default?: any;
    enum?: any[]; // Possible values for the parameter
    minValue?: number; // For number type
    maxValue?: number; // For number type
    pattern?: string; // Regex pattern for string type
    items?: { // For array type
        type: 'string' | 'number' | 'boolean' | 'object';
        description?: string;
    };
    properties?: Record<string, WorkflowParameterDefinition>; // For object type
}

/**
 * Represents the metadata for a workflow template.
 */
export interface WorkflowTemplateMetadata {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    author: string;
    tags: string[];
    parameters: Record<string, WorkflowParameterDefinition>;
}

/**
 * Represents the parameter values for a workflow template.
 */
export type WorkflowParameters = Record<string, any>;

/**
 * Represents a step in a workflow.
 */
export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    tool?: string; // Optional MCP tool to use
    parameters?: Record<string, any>; // Parameters for the tool
    dependsOn?: string[]; // IDs of steps that must complete before this one
    condition?: string; // Optional condition for executing this step
    timeout?: number; // Timeout in milliseconds
}

/**
 * Represents the execution result of a workflow.
 */
export interface WorkflowResult {
    success: boolean;
    stepResults: Record<string, any>;
    error?: string;
    output: any;
    executionTime: number;
    startedAt: string;
    completedAt: string;
}

/**
 * Abstract base class for workflow templates.
 * Workflow templates define reusable workflows that can be executed by agents.
 */
export abstract class WorkflowTemplate {
    /**
     * Gets the metadata for this workflow template.
     * @returns The template metadata
     */
    abstract getMetadata(): WorkflowTemplateMetadata;
    
    /**
     * Validates parameters against the template's parameter definitions.
     * @param parameters The parameters to validate
     * @returns True if valid, throws an error if invalid
     */
    validate(parameters: WorkflowParameters): boolean {
        const metadata = this.getMetadata();
        const paramDefs = metadata.parameters;
        
        // Check for missing required parameters
        for (const [paramName, paramDef] of Object.entries(paramDefs)) {
            if (paramDef.required && !(paramName in parameters)) {
                throw new Error(`Missing required parameter: ${paramName}`);
            }
        }
        
        // Check parameter types and constraints
        for (const [paramName, paramValue] of Object.entries(parameters)) {
            const paramDef = paramDefs[paramName];
            
            // Skip if the parameter is not defined in the template
            if (!paramDef) continue;
            
            // Validate type
            this.validateParameterType(paramName, paramValue, paramDef);
            
            // Validate constraints based on type
            this.validateParameterConstraints(paramName, paramValue, paramDef);
        }
        
        return true;
    }
    
    /**
     * Validates the type of a parameter.
     * @param paramName The parameter name
     * @param paramValue The parameter value
     * @param paramDef The parameter definition
     */
    private validateParameterType(paramName: string, paramValue: any, paramDef: WorkflowParameterDefinition): void {
        switch (paramDef.type) {
            case 'string':
                if (typeof paramValue !== 'string') {
                    throw new Error(`Parameter ${paramName} must be a string`);
                }
                break;
                
            case 'number':
                if (typeof paramValue !== 'number') {
                    throw new Error(`Parameter ${paramName} must be a number`);
                }
                break;
                
            case 'boolean':
                if (typeof paramValue !== 'boolean') {
                    throw new Error(`Parameter ${paramName} must be a boolean`);
                }
                break;
                
            case 'array':
                if (!Array.isArray(paramValue)) {
                    throw new Error(`Parameter ${paramName} must be an array`);
                }
                break;
                
            case 'object':
                if (typeof paramValue !== 'object' || paramValue === null || Array.isArray(paramValue)) {
                    throw new Error(`Parameter ${paramName} must be an object`);
                }
                break;
        }
    }
    
    /**
     * Validates the constraints of a parameter.
     * @param paramName The parameter name
     * @param paramValue The parameter value
     * @param paramDef The parameter definition
     */
    private validateParameterConstraints(paramName: string, paramValue: any, paramDef: WorkflowParameterDefinition): void {
        switch (paramDef.type) {
            case 'string':
                // Validate enum
                if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
                    throw new Error(`Parameter ${paramName} must be one of: ${paramDef.enum.join(', ')}`);
                }
                
                // Validate pattern
                if (paramDef.pattern && !new RegExp(paramDef.pattern).test(paramValue)) {
                    throw new Error(`Parameter ${paramName} must match the pattern: ${paramDef.pattern}`);
                }
                break;
                
            case 'number':
                // Validate min/max
                if (paramDef.minValue !== undefined && paramValue < paramDef.minValue) {
                    throw new Error(`Parameter ${paramName} must be at least ${paramDef.minValue}`);
                }
                
                if (paramDef.maxValue !== undefined && paramValue > paramDef.maxValue) {
                    throw new Error(`Parameter ${paramName} must be at most ${paramDef.maxValue}`);
                }
                
                // Validate enum
                if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
                    throw new Error(`Parameter ${paramName} must be one of: ${paramDef.enum.join(', ')}`);
                }
                break;
                
            case 'array':
                // Validate array items if items type is specified
                if (paramDef.items) {
                    for (let i = 0; i < paramValue.length; i++) {
                        const item = paramValue[i];
                        switch (paramDef.items.type) {
                            case 'string':
                                if (typeof item !== 'string') {
                                    throw new Error(`Item ${i} in parameter ${paramName} must be a string`);
                                }
                                break;
                                
                            case 'number':
                                if (typeof item !== 'number') {
                                    throw new Error(`Item ${i} in parameter ${paramName} must be a number`);
                                }
                                break;
                                
                            case 'boolean':
                                if (typeof item !== 'boolean') {
                                    throw new Error(`Item ${i} in parameter ${paramName} must be a boolean`);
                                }
                                break;
                                
                            case 'object':
                                if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                                    throw new Error(`Item ${i} in parameter ${paramName} must be an object`);
                                }
                                break;
                        }
                    }
                }
                break;
                
            case 'object':
                // Validate object properties if defined
                if (paramDef.properties) {
                    for (const [propName, propDef] of Object.entries(paramDef.properties)) {
                        // Check required properties
                        if (propDef.required && !(propName in paramValue)) {
                            throw new Error(`Missing required property ${propName} in parameter ${paramName}`);
                        }
                        
                        // Validate property value if present
                        if (propName in paramValue) {
                            const propValue = paramValue[propName];
                            this.validateParameterType(`${paramName}.${propName}`, propValue, propDef);
                            this.validateParameterConstraints(`${paramName}.${propName}`, propValue, propDef);
                        }
                    }
                }
                break;
        }
    }
    
    /**
     * Applies default values for parameters that were not provided.
     * @param parameters The parameters to fill in defaults for
     * @returns The parameters with defaults applied
     */
    applyDefaults(parameters: WorkflowParameters): WorkflowParameters {
        const metadata = this.getMetadata();
        const paramDefs = metadata.parameters;
        const result = { ...parameters };
        
        for (const [paramName, paramDef] of Object.entries(paramDefs)) {
            if (!(paramName in result) && 'default' in paramDef) {
                result[paramName] = paramDef.default;
            }
        }
        
        return result;
    }
    
    /**
     * Generates a natural language prompt based on the parameters.
     * The prompt can be used with an LLM to generate a plan for executing the workflow.
     * @param parameters The parameters for the workflow
     * @returns The natural language prompt
     */
    abstract generatePrompt(parameters: WorkflowParameters): string;
    
    /**
     * Generates a list of workflow steps based on the parameters.
     * @param parameters The parameters for the workflow
     * @returns The workflow steps
     */
    abstract generateSteps(parameters: WorkflowParameters): WorkflowStep[];
    
    /**
     * Processes the results of a workflow execution.
     * @param stepResults The results of each step in the workflow
     * @returns The final output of the workflow
     */
    abstract processResults(stepResults: Record<string, any>): any;
} 