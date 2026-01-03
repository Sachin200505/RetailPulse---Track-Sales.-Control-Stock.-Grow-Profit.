import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Smartphone, Wallet, CheckCircle2, XCircle, Loader2, QrCode, Banknote, ArrowRight } from 'lucide-react';

interface PaymentGatewayProps {
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  paymentMethod,
  onSuccess,
  onCancel
}) => {
  const [status, setStatus] = useState<'processing' | 'awaiting' | 'success' | 'failed'>('processing');
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(10);
  
  // Cash payment state
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showChange, setShowChange] = useState(false);

  // Generate QR pattern only once (stable for 10 seconds)
  const qrPattern = useMemo(() => {
    const rows = [];
    const seed = Math.floor(Date.now() / 10000); // Changes every 10 seconds
    const random = (x: number) => {
      const val = Math.sin(seed + x) * 10000;
      return val - Math.floor(val);
    };
    
    let cellIndex = 0;
    for (let i = 0; i < 21; i++) {
      const cells = [];
      for (let j = 0; j < 21; j++) {
        // Corner patterns (fixed position finders)
        const isCornerPattern = 
          (i < 7 && j < 7) || 
          (i < 7 && j > 13) || 
          (i > 13 && j < 7);
        
        const isCornerBorder = 
          isCornerPattern && (
            (i === 0 || i === 6) && j < 7 ||
            (j === 0 || j === 6) && i < 7 ||
            (i === 0 || i === 6) && j > 13 ||
            (j === 14 || j === 20) && i < 7 ||
            (i === 14 || i === 20) && j < 7 ||
            (j === 0 || j === 6) && i > 13
          );

        const isCornerInner = 
          isCornerPattern && (
            (i >= 2 && i <= 4 && j >= 2 && j <= 4) ||
            (i >= 2 && i <= 4 && j >= 16 && j <= 18) ||
            (i >= 16 && i <= 18 && j >= 2 && j <= 4)
          );

        const isFilled = isCornerBorder || isCornerInner || (!isCornerPattern && random(cellIndex++) > 0.5);
        
        cells.push(
          <div 
            key={j} 
            className={`w-2 h-2 ${isFilled ? 'bg-foreground' : 'bg-background'}`}
          />
        );
      }
      rows.push(
        <div key={i} className="flex">
          {cells}
        </div>
      );
    }
    return rows;
  }, []);

  const changeAmount = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    return received - amount;
  }, [cashReceived, amount]);

  useEffect(() => {
    if (paymentMethod === 'cash') {
      // Cash payment shows input immediately
      setStatus('awaiting');
      return;
    }

    // For UPI and Card, show specific UI first
    const initTimer = setTimeout(() => {
      setStatus('awaiting');
    }, 1500);

    return () => clearTimeout(initTimer);
  }, [paymentMethod]);

  useEffect(() => {
    if (status === 'awaiting' && paymentMethod !== 'cash') {
      // Start countdown for payment completion
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Simulate 95% success rate
            const isSuccess = Math.random() > 0.05;
            setStatus(isSuccess ? 'success' : 'failed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Progress bar animation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 100));
      }, 1000);

      return () => {
        clearInterval(countdownInterval);
        clearInterval(progressInterval);
      };
    }
  }, [status, paymentMethod]);

  useEffect(() => {
    if (status === 'success') {
      const successTimer = setTimeout(onSuccess, 1500);
      return () => clearTimeout(successTimer);
    }
  }, [status, onSuccess]);

  const handleCashPayment = () => {
    const received = parseFloat(cashReceived) || 0;
    if (received < amount) {
      return;
    }
    setShowChange(true);
  };

  const handleConfirmCash = () => {
    setStatus('success');
  };

  const getIcon = () => {
    switch (paymentMethod) {
      case 'cash': return <Wallet className="w-12 h-12" />;
      case 'upi': return <Smartphone className="w-12 h-12" />;
      case 'card': return <CreditCard className="w-12 h-12" />;
    }
  };

  const getMethodName = () => {
    switch (paymentMethod) {
      case 'cash': return 'Cash Payment';
      case 'upi': return 'UPI Payment';
      case 'card': return 'Card Payment';
    }
  };

  // Quick cash buttons
  const quickAmounts = [
    Math.ceil(amount / 100) * 100,
    Math.ceil(amount / 500) * 500,
    Math.ceil(amount / 1000) * 1000,
    Math.ceil(amount / 2000) * 2000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= amount).slice(0, 4);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Initial Processing */}
          {status === 'processing' && (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                {getIcon()}
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Initializing Payment</h2>
              <p className="text-muted-foreground mb-6">{getMethodName()}</p>
              
              <div className="mb-4">
                <div className="text-3xl font-bold text-primary mb-4">₹{amount.toLocaleString()}</div>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            </>
          )}

          {/* Cash Payment */}
          {status === 'awaiting' && paymentMethod === 'cash' && !showChange && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center text-success">
                <Banknote className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Cash Payment</h2>
              <p className="text-3xl font-bold text-primary mb-6">₹{amount.toLocaleString()}</p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-2">Amount Received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter amount..."
                    className="form-input text-center text-2xl font-bold"
                    autoFocus
                  />
                </div>

                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setCashReceived(amt.toString())}
                      className={`p-2 rounded-lg border text-sm font-medium transition-colors ${
                        cashReceived === amt.toString()
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {cashReceived && parseFloat(cashReceived) >= amount && (
                  <div className="p-4 bg-success/10 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Change to Return:</span>
                      <span className="text-2xl font-bold text-success">₹{changeAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onCancel}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCashPayment}
                    disabled={!cashReceived || parseFloat(cashReceived) < amount}
                    className="flex-1 btn-success flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>Confirm</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Cash - Show Change */}
          {status === 'awaiting' && paymentMethod === 'cash' && showChange && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center text-success">
                <Banknote className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-4">Return Change</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Bill Amount:</span>
                  <span className="font-semibold">₹{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Received:</span>
                  <span className="font-semibold">₹{parseFloat(cashReceived).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-4 bg-success/10 rounded-xl border-2 border-success">
                  <span className="font-medium text-success">Change:</span>
                  <span className="text-2xl font-bold text-success">₹{changeAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleConfirmCash}
                className="w-full btn-success h-12 text-lg"
              >
                Complete Payment
              </button>
            </>
          )}

          {/* UPI QR Code */}
          {status === 'awaiting' && paymentMethod === 'upi' && (
            <>
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                  <QrCode className="w-4 h-4" />
                  Scan QR Code
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">UPI Payment</h2>
                <p className="text-3xl font-bold text-primary mb-4">₹{amount.toLocaleString()}</p>
              </div>

              {/* QR Code - Stable for 10 seconds */}
              <div className="bg-background p-4 rounded-xl inline-block mb-4 border border-border">
                <div className="flex flex-col">
                  {qrPattern}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">Scan with any UPI app</p>
                <div className="flex items-center justify-center gap-4 opacity-60">
                  <span className="text-xs">Google Pay</span>
                  <span className="text-xs">PhonePe</span>
                  <span className="text-xs">Paytm</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Waiting for payment... ({countdown}s)
                </p>
              </div>

              <button
                onClick={onCancel}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </>
          )}

          {/* Card Swiping */}
          {status === 'awaiting' && paymentMethod === 'card' && (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CreditCard className="w-12 h-12 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Card Payment</h2>
              <p className="text-3xl font-bold text-primary mb-4">₹{amount.toLocaleString()}</p>

              <div className="bg-muted/50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-16 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md flex items-center justify-center">
                    <div className="w-8 h-6 border-2 border-amber-200 rounded-sm" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">Swipe/Insert Card</p>
                    <p className="text-xs text-muted-foreground">on the POS machine</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Waiting for card machine...</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Processing... ({countdown}s)
                </p>
              </div>

              <button
                onClick={onCancel}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-success" />
              </div>
              <h2 className="text-xl font-bold text-success mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-4">Transaction completed</p>
              <div className="text-3xl font-bold text-foreground">₹{amount.toLocaleString()}</div>
            </>
          )}

          {/* Failed */}
          {status === 'failed' && (
            <>
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-danger/10 flex items-center justify-center">
                <XCircle className="w-16 h-16 text-danger" />
              </div>
              <h2 className="text-xl font-bold text-danger mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">Transaction could not be completed</p>
              
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setStatus('processing');
                    setProgress(0);
                    setCountdown(10);
                  }}
                  className="flex-1 btn-primary"
                >
                  Retry
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
