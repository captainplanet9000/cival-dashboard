import { 
    AgentTool, 
    ToolDefinition, 
    ToolParameterDefinition 
} from "@/types/agentTypes";

/**
 * Defines the structure for the calculator tool's parameters.
 */
const calculatorParameters: { [key: string]: ToolParameterDefinition } = {
    operation: {
        type: 'string',
        description: "The arithmetic operation to perform: 'add', 'subtract', 'multiply', 'divide'.",
        required: true
    },
    operand1: {
        type: 'number',
        description: "The first number for the operation.",
        required: true
    },
    operand2: {
        type: 'number',
        description: "The second number for the operation.",
        required: true
    }
};

/**
 * Defines the calculator tool.
 */
const calculatorToolDefinition: ToolDefinition = {
    name: "calculator",
    description: "Performs basic arithmetic operations (add, subtract, multiply, divide) on two numbers.",
    parameters: calculatorParameters
};

/**
 * A simple tool implementation for performing calculations.
 */
export class CalculatorTool implements AgentTool {
    definition: ToolDefinition = calculatorToolDefinition;

    async execute(args: { operation: string; operand1: number; operand2: number }): Promise<number | string> {
        const { operation, operand1, operand2 } = args;

        switch (operation.toLowerCase()) {
            case 'add':
                return operand1 + operand2;
            case 'subtract':
                return operand1 - operand2;
            case 'multiply':
                return operand1 * operand2;
            case 'divide':
                if (operand2 === 0) {
                    throw new Error("Division by zero is not allowed.");
                }
                return operand1 / operand2;
            default:
                throw new Error(`Invalid operation: ${operation}. Supported operations are add, subtract, multiply, divide.`);
        }
    }
} 