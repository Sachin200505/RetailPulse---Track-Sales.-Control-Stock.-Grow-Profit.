-- Add expiry_date column to products table (optional field)
ALTER TABLE public.products 
ADD COLUMN expiry_date DATE DEFAULT NULL;

-- Create index for expiry date queries
CREATE INDEX idx_products_expiry_date ON public.products(expiry_date) WHERE expiry_date IS NOT NULL;