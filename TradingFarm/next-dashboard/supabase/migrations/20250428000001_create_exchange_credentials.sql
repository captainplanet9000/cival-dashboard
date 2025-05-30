-- Create the exchange_credentials table to store API credentials for various exchanges
CREATE TABLE IF NOT EXISTS public.exchange_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    exchange VARCHAR(50) NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    api_passphrase TEXT,
    is_testnet BOOLEAN DEFAULT false,
    label VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add triggers for created_at and updated_at timestamps
CREATE TRIGGER handle_created_at
BEFORE INSERT ON public.exchange_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.exchange_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security for the table
ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

-- Add RLS policies to ensure users can only access their own credentials
CREATE POLICY "Users can view their own exchange credentials"
ON public.exchange_credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exchange credentials"
ON public.exchange_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exchange credentials"
ON public.exchange_credentials
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exchange credentials"
ON public.exchange_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for quick lookup by user_id
CREATE INDEX exchange_credentials_user_id_idx ON public.exchange_credentials (user_id);

-- Create a unique index to ensure users don't have duplicate default credentials for the same exchange
CREATE UNIQUE INDEX exchange_credentials_user_default_exchange_idx 
ON public.exchange_credentials (user_id, exchange) 
WHERE is_default = true;
