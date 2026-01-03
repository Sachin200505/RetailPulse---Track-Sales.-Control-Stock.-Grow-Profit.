-- Create products table
CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name varchar(200) NOT NULL,
    category varchar(100) NOT NULL,
    cost_price numeric(12,2) NOT NULL,
    selling_price numeric(12,2) NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    sku varchar(50) NOT NULL UNIQUE,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create product_categories table
CREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name varchar(100) NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add tier column to customers
ALTER TABLE public.customers 
ADD COLUMN tier varchar(20) DEFAULT 'Bronze' NOT NULL;

-- Add points_redeemed column to track total redeemed
ALTER TABLE public.customers 
ADD COLUMN points_redeemed integer DEFAULT 0 NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Allow all operations on products" 
ON public.products 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for product_categories
CREATE POLICY "Allow all operations on product_categories" 
ON public.product_categories 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update product timestamps
CREATE OR REPLACE FUNCTION public.update_product_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for products updated_at
CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON public.products 
FOR EACH ROW 
EXECUTE FUNCTION public.update_product_updated_at();

-- Create function to calculate customer tier based on total purchases
CREATE OR REPLACE FUNCTION public.calculate_customer_tier(total_purchases numeric)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF total_purchases >= 50000 THEN
    RETURN 'Gold';
  ELSIF total_purchases >= 20000 THEN
    RETURN 'Silver';
  ELSE
    RETURN 'Bronze';
  END IF;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_customers_tier ON public.customers(tier);

-- Insert default categories
INSERT INTO public.product_categories (name, description) VALUES
('Groceries', 'Essential food items and staples'),
('Dairy', 'Milk, butter, cheese and dairy products'),
('Personal Care', 'Hygiene and personal care products'),
('Snacks', 'Chips, biscuits and snack items'),
('Beverages', 'Drinks and refreshments'),
('Household', 'Cleaning and household essentials');