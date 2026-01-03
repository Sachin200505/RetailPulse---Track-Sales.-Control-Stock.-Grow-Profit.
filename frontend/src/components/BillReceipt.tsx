import React, { useRef, useState } from 'react';
import { Printer, X, Gift, User, MessageSquare, Check, Loader2 } from 'lucide-react';
import { BillItem } from '@/services/billingService';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface BillReceiptProps {
  invoice: {
    transactionId?: string;
    invoiceNumber: string;
    items: BillItem[];
    subtotal: number;
    gstAmount: number;
    discount: number;
    pointsRedeemed?: number;
    totalAmount: number;
    paymentMethod: string;
    creditPointsEarned: number;
    customer?: {
      customerCode: string;
      totalCreditPoints: number;
      mobile?: string;
    };
    createdAt: Date;
  };
  onClose: () => void;
}

const BillReceipt: React.FC<BillReceiptProps> = ({ invoice, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  // Thermal printer format (58mm/80mm paper)
  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=302,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            @page { 
              size: 58mm auto; 
              margin: 0; 
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            body { 
              font-family: 'Courier New', 'Monaco', monospace; 
              font-size: 10px;
              width: 58mm;
              max-width: 58mm;
              padding: 2mm;
              line-height: 1.3;
              background: white;
              color: black;
            }
            .header { 
              text-align: center; 
              padding-bottom: 3mm;
              border-bottom: 1px dashed #000;
            }
            .header h1 { 
              font-size: 14px; 
              font-weight: bold;
              letter-spacing: 1px;
            }
            .header p { 
              font-size: 8px; 
              margin-top: 1mm;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              font-size: 9px;
              margin: 1mm 0;
            }
            .customer-box {
              text-align: center;
              padding: 2mm;
              margin: 2mm 0;
              border: 1px solid #000;
              font-size: 10px;
            }
            .customer-code {
              font-size: 12px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .divider { 
              border-top: 1px dashed #000; 
              margin: 2mm 0; 
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              font-weight: bold;
              padding: 1mm 0;
              border-bottom: 1px solid #000;
            }
            .item-row { 
              font-size: 9px;
              padding: 1mm 0;
              border-bottom: 1px dotted #ccc;
            }
            .item-name {
              font-weight: bold;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              display: grid;
              grid-template-columns: 1.2fr 0.7fr 0.9fr;
              column-gap: 3mm;
              padding-top: 2mm;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              font-size: 9px;
              margin: 1mm 0;
            }
            .total-row.discount { color: #090; }
            .grand-total { 
              font-size: 12px; 
              font-weight: bold;
              padding: 2mm 0;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
              margin: 2mm 0;
            }
            .points-box { 
              text-align: center; 
              padding: 2mm;
              margin: 2mm 0;
              border: 1px dashed #000;
              background: #f9f9f9;
            }
            .points-earned {
              font-size: 11px;
              font-weight: bold;
            }
            .footer { 
              text-align: center; 
              font-size: 8px;
              padding-top: 3mm;
              border-top: 1px dashed #000;
              margin-top: 2mm;
            }
            .barcode {
              text-align: center;
              margin: 2mm 0;
              font-family: 'Libre Barcode 39', monospace;
              font-size: 24px;
              letter-spacing: 2px;
            }
            @media print {
              body { 
                width: 58mm;
                max-width: 58mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SMART RETAIL</h1>
            <p>Your Shopping Partner</p>
            <p>GST: 29XXXXX1234X1Z5</p>
          </div>
          
          <div style="padding: 2mm 0;">
            <div class="info-row">
              <span>INV#:</span>
              <span>${invoice.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span>Date:</span>
              <span>${invoice.createdAt.toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span>Time:</span>
              <span>${invoice.createdAt.toLocaleTimeString()}</span>
            </div>
            <div class="info-row">
              <span>Payment:</span>
              <span>${invoice.paymentMethod.toUpperCase()}</span>
            </div>
          </div>
          
          ${invoice.customer ? `
          <div class="customer-box">
            <div>Customer ID</div>
            <div class="customer-code">${invoice.customer.customerCode}</div>
          </div>
          ` : ''}
          
          <div class="divider"></div>
          
          <div class="item-header" style="align-items: center; column-gap: 3mm;">
            <span>ITEM</span>
            <div style="display: grid; grid-template-columns: 1.2fr 0.7fr 0.9fr; column-gap: 3mm; width: 68%; text-align: right;">
              <span style="text-align: right;">QTY x RATE</span>
              <span style="text-align: right;">GST</span>
              <span style="text-align: right;">AMT</span>
            </div>
          </div>
          
          ${invoice.items.map(item => `
          <div class="item-row">
            <div class="item-name">${item.product.name}</div>
            <div class="item-details">
              <span style="text-align: right;">${item.quantity} x ₹${Number(item.product.sellingPrice).toFixed(2)}</span>
              <span style="text-align: right;">${formatGstRate(item)}</span>
              <span style="text-align: right;">₹${getLineTotalWithGst(item).toFixed(2)}</span>
            </div>
          </div>
          `).join('')}
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${invoice.subtotal.toLocaleString()}</span>
            </div>
            ${invoice.discount > 0 ? `
            <div class="total-row discount">
              <span>Discount:</span>
              <span>-₹${invoice.discount.toLocaleString()}</span>
            </div>
            ` : ''}
            ${invoice.pointsRedeemed && invoice.pointsRedeemed > 0 ? `
            <div class="total-row discount">
              <span>Points (${invoice.pointsRedeemed}):</span>
              <span>-₹${invoice.pointsRedeemed.toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>GST:</span>
              <span>₹${invoice.gstAmount.toLocaleString()}</span>
            </div>
            <div class="grand-total">
              <div class="total-row">
                <span>TOTAL:</span>
                <span>₹${invoice.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          ${invoice.creditPointsEarned > 0 ? `
          <div class="points-box">
            <div class="points-earned">+${invoice.creditPointsEarned} Points Earned!</div>
            ${invoice.customer ? `<div>Balance: ${invoice.customer.totalCreditPoints} pts</div>` : ''}
          </div>
          ` : ''}
          
          <div class="barcode">*${invoice.invoiceNumber}*</div>
          
          <div class="footer">
            <p>Thank you for shopping!</p>
            <p>Visit us again</p>
            <p style="margin-top: 2mm;">--- End of Bill ---</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleSendSms = async () => {
    if (!invoice.transactionId) {
      toast.error('Missing transaction reference');
      return;
    }

    setSendingSms(true);

    try {
      await api.post(`/api/transactions/${invoice.transactionId}/send-sms`, {});
      setSmsSent(true);
      toast.success('Receipt sent via SMS');
    } catch (error) {
      console.error('Failed to send SMS receipt', error);
      toast.error('Failed to send SMS');
    } finally {
      setSendingSms(false);
    }
  };

  const getLineGstRate = (item: any) => {
    const subtotal = getLineSubtotal(item);
    const gstAmount = getLineGstAmount(item);
    if (item.gstRate !== undefined && item.gstRate !== null) return Number(item.gstRate);
    if (subtotal > 0) return (gstAmount * 100) / subtotal;
    return 0;
  };

  const formatGstRate = (item: any) => {
    const rate = getLineGstRate(item);
    const rounded = Math.round(rate * 100) / 100;
    return rounded % 1 === 0 ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(2)}%`;
  };

  const getLineSubtotal = (item: any) => Number(item.subtotal ?? 0);
  const getLineGstAmount = (item: any) => Number(item.gstAmount ?? item.gst_amount ?? 0);
  const getLineTotalWithGst = (item: any) => {
    const subtotal = getLineSubtotal(item);
    const gstAmount = getLineGstAmount(item);
    return Number(item.totalWithGst ?? subtotal + gstAmount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Actions Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Bill Receipt</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {invoice.customer?.mobile && (
              <button
                onClick={handleSendSms}
                disabled={sendingSms || smsSent}
                className="btn-secondary flex items-center gap-2"
              >
                {sendingSms ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : smsSent ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                {smsSent ? 'Sent' : 'SMS'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Content (Screen View) */}
        <div ref={receiptRef} className="p-6">
          <div className="header text-center mb-6">
            <h1 className="text-xl font-bold text-foreground">SMART RETAIL</h1>
            <p className="text-sm text-muted-foreground">Your Shopping Partner</p>
            <p className="text-xs text-muted-foreground mt-1">GST: 29XXXXX1234X1Z5</p>
          </div>

          <div className="invoice-info mb-4 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Invoice No:</span>
              <span className="font-semibold">{invoice.invoiceNumber}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{invoice.createdAt.toLocaleDateString()}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span>{invoice.createdAt.toLocaleTimeString()}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Payment:</span>
              <span className="uppercase">{invoice.paymentMethod}</span>
            </p>
          </div>

          {invoice.customer && (
            <div className="customer-info bg-muted p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Customer ID</span>
                </div>
                <span className="font-mono font-bold text-primary">{invoice.customer.customerCode}</span>
              </div>
            </div>
          )}

          <div className="border-t border-dashed border-border pt-4 mb-4">
            <div className="grid grid-cols-12 gap-x-3 text-xs font-semibold text-muted-foreground mb-2">
              <span className="col-span-5">ITEM</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-2 text-right">RATE</span>
              <span className="col-span-1 text-right">GST</span>
              <span className="col-span-2 text-right">AMT</span>
            </div>
            
            {invoice.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-x-3 text-sm py-1">
                <span className="col-span-5 truncate">{item.product.name}</span>
                <span className="col-span-2 text-center">{item.quantity}</span>
                <span className="col-span-2 text-right">₹{Number(item.product.sellingPrice).toFixed(2)}</span>
                <span className="col-span-1 text-right">{formatGstRate(item)}</span>
                <span className="col-span-2 text-right">₹{getLineTotalWithGst(item).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{invoice.subtotal.toLocaleString()}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-₹{invoice.discount.toLocaleString()}</span>
              </div>
            )}
            {invoice.pointsRedeemed && invoice.pointsRedeemed > 0 && (
              <div className="flex justify-between text-success">
                <span>Points Redeemed ({invoice.pointsRedeemed} pts)</span>
                <span>-₹{invoice.pointsRedeemed.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST</span>
              <span>₹{invoice.gstAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>TOTAL</span>
              <span className="text-primary">₹{invoice.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {invoice.creditPointsEarned > 0 && (
            <div className="mt-4 p-3 bg-success/10 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-success font-semibold">
                <Gift className="w-5 h-5" />
                <span>+{invoice.creditPointsEarned} Points Earned!</span>
              </div>
              {invoice.customer && (
                <p className="text-xs text-muted-foreground mt-1">
                  Total Points: {invoice.customer.totalCreditPoints}
                </p>
              )}
            </div>
          )}

          <div className="footer mt-6 pt-4 border-t border-dashed border-border text-center text-xs text-muted-foreground">
            <p>Thank you for shopping with us!</p>
            <p className="mt-1">Visit again</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillReceipt;
