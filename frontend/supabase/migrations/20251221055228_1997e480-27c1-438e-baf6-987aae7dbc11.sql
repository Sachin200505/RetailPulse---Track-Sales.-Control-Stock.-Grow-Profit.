-- Add unique customer code to customers table
ALTER TABLE public.customers
ADD COLUMN customer_code VARCHAR(10) UNIQUE;

-- Create function to generate unique customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(10);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code: RP + 6 random digits
    new_code := 'RP' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE customer_code = new_code) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.customer_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate customer code
CREATE TRIGGER generate_customer_code_trigger
BEFORE INSERT ON public.customers
FOR EACH ROW
WHEN (NEW.customer_code IS NULL)
EXECUTE FUNCTION public.generate_customer_code();

-- Update existing customers with codes
UPDATE public.customers
SET customer_code = 'RP' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE customer_code IS NULL;