import * as z from 'zod';

// Common validation schemas for form fields
export const validationSchemas = {
  // User profile validations
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  // Trading validations
  leverage: z.number()
    .min(1, 'Leverage must be at least 1x')
    .max(100, 'Leverage must be less than 100x'),
  
  amount: z.number()
    .positive('Amount must be greater than 0'),
  
  price: z.number()
    .positive('Price must be greater than 0'),
  
  stopLoss: z.number()
    .positive('Stop loss must be greater than 0')
    .optional(),
  
  takeProfit: z.number()
    .positive('Take profit must be greater than 0')
    .optional(),
  
  // API key validations
  apiKey: z.string().min(10, 'API key is too short'),
  apiSecret: z.string().min(10, 'API secret is too short'),
  
  // Time-based validations
  dateRange: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }).refine(data => data.startDate < data.endDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  }),
  
  // Form combination validations
  passwordConfirmation: z.object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
};

export type ValidationError = {
  path: string[];
  message: string;
};

export function validateField<T>(
  schema: z.ZodType<T>,
  value: unknown
): { success: boolean; error?: string } {
  const result = schema.safeParse(value);
  
  if (!result.success) {
    const formattedError = result.error.format();
    const firstError = result.error.errors[0];
    return {
      success: false,
      error: firstError.message,
    };
  }
  
  return { success: true };
}

export function validateForm<T>(
  schema: z.ZodType<T>,
  values: unknown
): { success: boolean; errors?: ValidationError[] } {
  const result = schema.safeParse(values);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      path: err.path.map(p => String(p)),
      message: err.message,
    }));
    
    return {
      success: false,
      errors,
    };
  }
  
  return { success: true };
}

// Helper function to get error message for a specific field
export function getFieldError(
  errors: ValidationError[] | undefined,
  path: string
): string | undefined {
  if (!errors) return undefined;
  
  const error = errors.find(err => 
    err.path.join('.') === path || err.path[0] === path
  );
  
  return error?.message;
}

// Trading order validation schemas

// Market order schema - price not required
export const marketOrderSchema = z.object({
  orderType: z.literal('market'),
  side: z.enum(['buy', 'sell']),
  price: z.string().optional(),
  amount: z.string().refine(
    (val) => !!val && parseFloat(val) > 0,
    { message: "Amount must be greater than 0" }
  ),
  leverage: z.number().min(1, "Leverage must be at least 1x").max(100, "Leverage must be less than 100x"),
  symbol: z.string().min(1, "Symbol is required"),
  exchange: z.string().min(1, "Exchange is required"),
});

// Limit order schema - price required
export const limitOrderSchema = z.object({
  orderType: z.literal('limit'),
  side: z.enum(['buy', 'sell']),
  price: z.string().refine(
    (val) => !!val && parseFloat(val) > 0,
    { message: "Price must be greater than 0" }
  ),
  amount: z.string().refine(
    (val) => !!val && parseFloat(val) > 0,
    { message: "Amount must be greater than 0" }
  ),
  leverage: z.number().min(1, "Leverage must be at least 1x").max(100, "Leverage must be less than 100x"),
  symbol: z.string().min(1, "Symbol is required"),
  exchange: z.string().min(1, "Exchange is required"),
});

// Combined trading order schema
export const tradingOrderSchema = z.discriminatedUnion('orderType', [
  marketOrderSchema,
  limitOrderSchema
]);

// Example schema for AccountSettings form
export const accountProfileSchema = z.object({
  name: validationSchemas.name,
  email: validationSchemas.email,
  timezone: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
});

// Example schema for Position management
export const positionUpdateSchema = z.object({
  stopLoss: validationSchemas.stopLoss,
  takeProfit: validationSchemas.takeProfit,
});

// Example schema for Trading terminal
export const tradeOrderSchema = z.object({
  symbol: z.string(),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']),
  amount: validationSchemas.amount,
  price: validationSchemas.price.optional().nullable(),
  leverage: validationSchemas.leverage,
});

// Example schema for Exchange credentials
export const exchangeCredentialsSchema = z.object({
  exchange: z.string().min(1, 'Please select an exchange'),
  apiKey: validationSchemas.apiKey,
  apiSecret: validationSchemas.apiSecret,
  passphrase: z.string().optional(),
});

// Example schema for password update
export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: validationSchemas.password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
