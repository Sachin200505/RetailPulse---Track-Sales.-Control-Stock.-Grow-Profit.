import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Wallet, Smartphone, Receipt, Package, User, Phone, Gift, Coins, Hash, AlertCircle, Loader2 } from 'lucide-react';
import { productService, Product, CategoryGst } from '@/services/productService';
import { billingService, BillItem } from '@/services/billingService';
import { customerService, Customer } from '@/services/customerService';
import PaymentGateway from '@/components/PaymentGateway';
import BillReceipt from '@/components/BillReceipt';
import { LoyaltyTierBadge, TierProgress } from '@/components/LoyaltyTierBadge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Billing: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [loading, setLoading] = useState(true);
  
  // Customer state
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Points redemption state
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Payment flow state
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [categoriesGst, setCategoriesGst] = useState<CategoryGst[]>([]);

  // Hardened checkout state
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Keyboard navigation for product search
  const [focusedProductIndex, setFocusedProductIndex] = useState(-1);
  const [focusedCustomerIndex, setFocusedCustomerIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        p.stock > 0
      );
      setSearchResults(results.slice(0, 5));
      setFocusedProductIndex(-1);
    } else {
      setSearchResults([]);
      setFocusedProductIndex(-1);
    }
  }, [searchQuery, products]);

  // Customer search effect
  useEffect(() => {
    const searchCustomers = async () => {
      const query = customerMobile.trim() || customerName.trim();
      if (query.length >= 2) {
        try {
          const results = await customerService.searchCustomers(query);
          setCustomerSuggestions(results);
          setShowCustomerDropdown(results.length > 0);
          setFocusedCustomerIndex(-1);
        } catch (error) {
          console.error('Error searching customers:', error);
        }
      } else {
        setCustomerSuggestions([]);
        setShowCustomerDropdown(false);
        setFocusedCustomerIndex(-1);
      }
    };

    const debounce = setTimeout(searchCustomers, 200);
    return () => clearTimeout(debounce);
  }, [customerMobile, customerName]);

  // Keyboard navigation handler for customer search
  const handleCustomerKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerDropdown || customerSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        setFocusedCustomerIndex(prev => 
          prev < customerSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        setFocusedCustomerIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedCustomerIndex >= 0 && focusedCustomerIndex < customerSuggestions.length) {
          selectCustomer(customerSuggestions[focusedCustomerIndex]);
        } else if (customerSuggestions.length > 0) {
          selectCustomer(customerSuggestions[0]);
        }
        break;
      case 'Escape':
        setShowCustomerDropdown(false);
        setFocusedCustomerIndex(-1);
        break;
    }
  }, [showCustomerDropdown, customerSuggestions, focusedCustomerIndex]);

  // Reset points redemption when customer changes
  useEffect(() => {
    setRedeemPoints(false);
    setPointsToRedeem(0);
  }, [selectedCustomer?.id]);

  // Keyboard navigation handler for product search
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        setFocusedProductIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        setFocusedProductIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedProductIndex >= 0 && focusedProductIndex < searchResults.length) {
          addToCart(searchResults[focusedProductIndex]);
        } else if (searchResults.length > 0) {
          addToCart(searchResults[0]);
        }
        break;
      case 'Escape':
        setSearchQuery('');
        setSearchResults([]);
        setFocusedProductIndex(-1);
        break;
    }
  }, [searchResults, focusedProductIndex]);

  const fetchProducts = async () => {
    try {
      const [data, gstData] = await Promise.all([
        productService.getAll(),
        productService.getCategoriesGst(),
      ]);
      setProducts(data);
      setCategoriesGst(gstData);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const normalizeCategory = useCallback((name: string) => name?.trim().toLowerCase() || '', []);

  const categoryGstMap = useMemo(() => {
    const map = new Map<string, number>();
    categoriesGst.forEach(c => {
      map.set(normalizeCategory(c.name), c.gstRate);
    });
    return map;
  }, [categoriesGst, normalizeCategory]);

  const getGstRateForCategory = (category: string) => {
    const rate = categoryGstMap.get(normalizeCategory(category));
    return rate ?? 0;
  };

  const buildCartItem = (product: Product, quantity: number): BillItem => {
    const subtotal = product.sellingPrice * quantity;
    const gstRate = getGstRateForCategory(product.category);
    const gstAmount = (subtotal * gstRate) / 100;
    return {
      product,
      quantity,
      subtotal,
      gstRate,
      gstAmount,
      totalWithGst: subtotal + gstAmount,
    };
  };

  useEffect(() => {
    if (categoriesGst.length === 0 || cartItems.length === 0) return;
    setCartItems(items => items.map(item => buildCartItem(item.product, item.quantity)));
  }, [categoriesGst, categoryGstMap]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerMobile(customer.mobile);
    setCustomerName(customer.name);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerMobile('');
    setCustomerName('');
    setRedeemPoints(false);
    setPointsToRedeem(0);
  };

  const addToCart = (product: Product) => {
    const existing = cartItems.find(item => item.product.id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error('Not enough stock available');
        return;
      }
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setCartItems([...cartItems, buildCartItem(product, 1)]);
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setFocusedProductIndex(-1);
    setCheckoutError(null);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
      toast.error('Not enough stock available');
      return;
    }
    
    setCartItems(cartItems.map(item =>
      item.product.id === productId
        ? buildCartItem(item.product, newQuantity)
        : item
    ));
    setCheckoutError(null);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product.id !== productId));
    setCheckoutError(null);
  };

  // Calculate max redeemable points
  const maxRedeemablePoints = useMemo(() => {
    if (!selectedCustomer || cartItems.length === 0) return 0;
    
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tier = selectedCustomer.tier;
    const benefits = customerService.getTierBenefits(tier);
    const maxDiscount = subtotal * benefits.discountLimit;
    
    return Math.min(selectedCustomer.credit_points, Math.floor(maxDiscount));
  }, [selectedCustomer, cartItems]);

  // Calculate points discount
  const pointsDiscount = useMemo(() => {
    if (!redeemPoints || !selectedCustomer) return 0;
    return Math.min(pointsToRedeem, maxRedeemablePoints);
  }, [redeemPoints, pointsToRedeem, maxRedeemablePoints, selectedCustomer]);

  const totals = useMemo(() => {
    const baseTotals = billingService.calculateTotals(cartItems, discount, pointsDiscount);
    return { ...baseTotals, pointsDiscount: pointsDiscount || 0 };
  }, [cartItems, discount, pointsDiscount]);

  const creditPointsToEarn = useMemo(() => {
    const tier = selectedCustomer?.tier || 'Bronze';
    return customerService.calculateCreditPoints(totals.totalAmount, tier);
  }, [totals.totalAmount, selectedCustomer]);

  const percentDiscountAmount = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    return Math.round(((subtotal * discount) / 100) * 100) / 100;
  }, [cartItems, discount]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Add items to the bill first');
      return;
    }

    if (!customerMobile.trim() || !customerName.trim()) {
      toast.error('Please enter customer details');
      return;
    }

    if (customerMobile.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    // Prevent double click
    if (isProcessing) {
      return;
    }

    // Generate checkout session ID for double-billing prevention
    const sessionId = billingService.generateCheckoutSessionId();
    
    setCheckoutSessionId(sessionId);
    setCheckoutError(null);

    // Verify stock before showing payment gateway
    setIsProcessing(true);
    const stockCheck = await billingService.verifyStockAvailability(cartItems);
    
    if (!stockCheck.available) {
      setIsProcessing(false);
      setCheckoutError(stockCheck.issues.join('\n'));
      toast.error('Stock not available for some items');
      return;
    }
    
    setIsProcessing(false);
    setShowPaymentGateway(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentGateway(false);
    setIsProcessing(true);
    setCheckoutError(null);
    
    // Generate a fresh session ID for the actual transaction
    const transactionSessionId = billingService.generateCheckoutSessionId();
    
    try {
      // Create or get customer
      const customer = await customerService.upsertCustomer(customerMobile, customerName);
      
      // Generate invoice number
      const invoiceNumber = await customerService.generateInvoiceNumber();
      
      // Redeem points if applicable
      let actualPointsRedeemed = 0;
      if (redeemPoints && pointsDiscount > 0 && selectedCustomer) {
        const redemption = await customerService.redeemPoints(
          customer.id, 
          pointsDiscount, 
          totals.subtotal - totals.discount
        );
        actualPointsRedeemed = redemption.pointsUsed;
      }
      
      // Add credit points
      const creditPointsEarned = await customerService.addCreditPoints(customer.id, totals.totalAmount);
      const totalDiscountForBackend = percentDiscountAmount + pointsDiscount;
      
      // Process hardened checkout (stock decrease + transaction creation)
      const result = await billingService.processHardenedCheckout(
        transactionSessionId,
        cartItems,
        customer.id,
        invoiceNumber,
        {
          subtotal: totals.subtotal,
          gstAmount: totals.gstAmount,
          discount: totalDiscountForBackend,
          totalAmount: totals.totalAmount
        },
        paymentMethod,
        creditPointsEarned
      );

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      // Log audit
      try {
        await supabase.rpc('log_audit', {
          _action_type: 'SALE',
          _entity_type: 'transaction',
          _entity_id: invoiceNumber,
          _old_values: null,
          _new_values: { 
            total_amount: totals.totalAmount, 
            items_count: cartItems.length,
            payment_method: paymentMethod 
          },
          _notes: `Sale to ${customer.name}`
        });
      } catch (auditError) {
        console.error('Failed to log audit:', auditError);
      }

      // Fetch updated customer for total points
      const updatedCustomer = await customerService.getByMobile(customerMobile);
      
      // Set invoice for receipt (include transaction id for SMS)
      setCurrentInvoice({
        transactionId: result.transaction?.id,
        invoiceNumber,
        items: cartItems,
        subtotal: totals.subtotal,
        gstAmount: totals.gstAmount,
        discount: percentDiscountAmount,
        pointsRedeemed: actualPointsRedeemed,
        totalAmount: totals.totalAmount,
        paymentMethod,
        creditPointsEarned,
        customer: {
          customerCode: updatedCustomer?.customer_code || customer.customer_code,
          totalCreditPoints: updatedCustomer?.credit_points || creditPointsEarned,
          mobile: customerMobile
        },
        createdAt: new Date()
      });
      
      setShowReceipt(true);
      toast.success('Payment completed successfully!');
      
      // Refresh products to update stock
      fetchProducts();
      
    } catch (error: any) {
      console.error('Error processing sale:', error);
      setCheckoutError(error.message || 'Failed to complete sale');
      toast.error(error.message || 'Failed to complete sale. Please try again.');
      // Ensure session is unlocked on error
      billingService.unlockCheckout(transactionSessionId);
    } finally {
      setIsProcessing(false);
      setCheckoutSessionId(null);
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentGateway(false);
    setCheckoutSessionId(null);
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCurrentInvoice(null);
    setCartItems([]);
    setDiscount(0);
    setPaymentMethod('cash');
    setRedeemPoints(false);
    setPointsToRedeem(0);
    setSelectedCustomer(null);
    setCustomerMobile('');
    setCustomerName('');
    setCheckoutError(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 h-[calc(100vh-7rem)]">
        {/* Product Search & Cart */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Customer Info */}
          <div className="dashboard-card p-3 md:p-4">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              Customer Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={customerInputRef}
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setCustomerMobile(value);
                    if (selectedCustomer && value !== selectedCustomer.mobile) {
                      setSelectedCustomer(null);
                    }
                  }}
                  onKeyDown={handleCustomerKeyDown}
                  placeholder="Mobile Number (use ↑↓ Enter)"
                  className="form-input pl-10 text-sm py-2"
                />
                
                {/* Customer Suggestions Dropdown */}
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                    {customerSuggestions.map((customer, index) => (
                      <button
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className={`w-full flex items-center justify-between p-2 hover:bg-muted text-left text-sm transition-colors ${
                          focusedCustomerIndex === index ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-foreground">{customer.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{customer.customer_code}</p>
                          </div>
                          <LoyaltyTierBadge tier={customer.tier} size="sm" />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Gift className="w-3 h-3" />
                          <span>{customer.credit_points} pts</span>
                        </div>
                      </button>
                    ))}
                    <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                      Use ↑↓/PgUp/PgDn to navigate, Enter to select
                    </div>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="form-input pl-10 text-sm py-2"
                  disabled={!!selectedCustomer}
                />
              </div>
            </div>
            
            {selectedCustomer && (
              <div className="mt-2 space-y-2">
                {/* Customer Tier & Points */}
                <div className="p-2 bg-primary/5 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{selectedCustomer.name}</span>
                      <LoyaltyTierBadge tier={selectedCustomer.tier} size="sm" />
                    </div>
                    <button
                      onClick={clearCustomer}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono font-semibold text-primary">{selectedCustomer.customer_code}</span>
                    <span className="text-muted-foreground">|</span>
                    <Gift className="w-3 h-3 text-primary" />
                    <span className="font-semibold text-primary">{selectedCustomer.credit_points} pts</span>
                    <span className="text-muted-foreground hidden sm:inline">|</span>
                    <span className="text-muted-foreground hidden sm:inline">Spent: ₹{Number(selectedCustomer.total_purchases).toLocaleString()}</span>
                  </div>
                </div>

                {/* Tier Progress - compact */}
                <TierProgress 
                  currentPurchases={Number(selectedCustomer.total_purchases)} 
                  currentTier={selectedCustomer.tier} 
                />
              </div>
            )}
          </div>

          {/* Search */}
          <div className="dashboard-card relative p-3 md:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products... (type & use ↓↑ Enter)"
                className="form-input pl-10 text-sm py-2"
              />
            </div>
            
            {/* Search Results Dropdown with keyboard navigation */}
            {searchResults.length > 0 && (
              <div 
                ref={productDropdownRef}
                className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden mx-3 md:mx-4"
              >
                {searchResults.map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`w-full flex items-center justify-between p-2 hover:bg-muted text-left text-sm transition-colors ${
                      focusedProductIndex === index ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-primary">₹{product.sellingPrice}</p>
                  </button>
                ))}
                <div className="px-3 py-2 bg-muted/50 text-xs text-muted-foreground">
                  Use ↑↓ to navigate, Enter to select
                </div>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="dashboard-card flex-1 overflow-auto p-3 md:p-4">
            <h3 className="font-semibold text-foreground mb-2 text-sm">Cart ({cartItems.length})</h3>
            
            {checkoutError && (
              <div className="mb-2 p-2 bg-danger/10 rounded-lg flex items-start gap-2 text-danger text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{checkoutError}</span>
              </div>
            )}
            
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Receipt className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No items in cart</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {cartItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate text-sm">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.product.sellingPrice} each</p>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-background rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1.5 hover:bg-muted rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1.5 hover:bg-muted rounded-r-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <p className="w-16 text-right text-xs text-muted-foreground">₹{(item.gstAmount || 0).toFixed(2)} GST</p>
                    <p className="font-semibold w-20 text-right text-sm">₹{(item.totalWithGst ?? (item.subtotal + (item.gstAmount || 0))).toLocaleString()}</p>
                    
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 hover:bg-danger/10 rounded-lg text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bill Summary */}
        <div className="dashboard-card flex flex-col p-3 md:p-4">
          <h3 className="font-semibold text-foreground mb-2 text-sm">Bill Summary</h3>
          
          {/* Summary Details */}
          <div className="flex-1 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">₹{totals.subtotal.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Discount (%)</span>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="form-input w-16 text-xs py-1"
                min="0"
                max="100"
              />
              <span className="font-medium ml-auto">-₹{percentDiscountAmount.toLocaleString()}</span>
            </div>
            
            {/* Points Redemption */}
            {selectedCustomer && selectedCustomer.credit_points > 0 && cartItems.length > 0 && (
              <div className="p-2 bg-primary/5 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redeemPoints}
                      onChange={(e) => {
                        setRedeemPoints(e.target.checked);
                        if (e.target.checked) {
                          setPointsToRedeem(maxRedeemablePoints);
                        } else {
                          setPointsToRedeem(0);
                        }
                      }}
                      className="rounded border-primary text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Coins className="w-3 h-3 text-primary" />
                      Redeem Points
                    </span>
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {selectedCustomer.credit_points} pts
                  </span>
                </div>
                
                {redeemPoints && (
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max={maxRedeemablePoints}
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                      className="flex-1 accent-primary h-1"
                    />
                    <span className="text-xs font-semibold text-primary w-16 text-right">
                      -{pointsDiscount} pts
                    </span>
                  </div>
                )}
              </div>
            )}

            {pointsDiscount > 0 && (
              <div className="flex justify-between text-success">
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Points
                </span>
                <span className="font-medium">-₹{pointsDiscount.toLocaleString()}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST</span>
              <span className="font-medium">₹{totals.gstAmount.toLocaleString()}</span>
            </div>
            
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary">₹{totals.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Credit Points Preview */}
            {creditPointsToEarn > 0 && customerMobile && (
              <div className="flex items-center justify-between p-2 bg-success/10 rounded-lg text-xs">
                <div className="flex items-center gap-1 text-success">
                  <Gift className="w-3 h-3" />
                  <span>Points to earn</span>
                </div>
                <span className="font-semibold text-success">+{creditPointsToEarn}</span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="mt-4">
            <p className="text-xs font-medium text-foreground mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-2 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('upi')}
                className={`p-2 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-colors ${
                  paymentMethod === 'upi'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-xs font-medium">UPI</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-2 rounded-lg border-2 flex flex-col items-center gap-0.5 transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-medium">Card</span>
              </button>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || isProcessing}
            className="btn-success w-full h-10 mt-4 text-sm flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Complete Sale - ₹{totals.totalAmount.toLocaleString()}</>
            )}
          </button>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {showPaymentGateway && (
        <PaymentGateway
          amount={totals.totalAmount}
          paymentMethod={paymentMethod}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && currentInvoice && (
        <BillReceipt
          invoice={currentInvoice}
          onClose={handleReceiptClose}
        />
      )}
    </>
  );
};

export default Billing;