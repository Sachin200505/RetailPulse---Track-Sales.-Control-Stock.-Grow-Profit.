import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  type: 'low_stock' | 'receipt';
  alertId?: string;
  transactionId?: string;
  phoneNumber?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, alertId, transactionId, phoneNumber } = await req.json() as SMSRequest;

    let message = '';
    let toNumber = phoneNumber;

    if (type === 'low_stock' && alertId) {
      // Get alert details with product info
      const { data: alert, error: alertError } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          products (name, sku, stock)
        `)
        .eq('id', alertId)
        .single();

      if (alertError || !alert) {
        console.error('Alert fetch error:', alertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Alert not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get owner's phone number
      const { data: ownerRole } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'owner')
        .single();

      if (ownerRole) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('mobile_number')
          .eq('id', ownerRole.user_id)
          .single();
        
        toNumber = ownerProfile?.mobile_number || phoneNumber;
      }

      const product = alert.products as { name: string; sku: string; stock: number };
      message = `🚨 RetailPulse Alert: Product "${product.name}" (SKU: ${product.sku}) stock is LOW! Only ${alert.stock_level} units left. Please restock immediately.`;

      // Update alert as SMS sent
      await supabase
        .from('stock_alerts')
        .update({ 
          sms_sent: true, 
          sms_sent_at: new Date().toISOString() 
        })
        .eq('id', alertId);

    } else if (type === 'receipt' && transactionId) {
      // Get transaction details
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          customers (name, mobile)
        `)
        .eq('id', transactionId)
        .single();

      if (txError || !transaction) {
        console.error('Transaction fetch error:', txError);
        return new Response(
          JSON.stringify({ success: false, error: 'Transaction not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customer = transaction.customers as { name: string; mobile: string } | null;
      toNumber = customer?.mobile || phoneNumber;
      
      message = `Thank you for shopping at RetailPulse! Invoice: ${transaction.invoice_number}, Amount: ₹${transaction.total_amount}. Points earned: ${transaction.credit_points_earned}. Visit again!`;
    }

    if (!toNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'No phone number provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for India
    const formattedPhone = toNumber.startsWith('+') ? toNumber : `+91${toNumber}`;

    // Send SMS via Twilio
    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioPhoneNumber,
          Body: message,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('Twilio error:', result);
        return new Response(
          JSON.stringify({ success: false, error: result.message || 'SMS sending failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('SMS sent successfully:', result.sid);
      return new Response(
        JSON.stringify({ success: true, messageSid: result.sid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Mock SMS for development
      console.log('Mock SMS sent:', { to: formattedPhone, message });
      return new Response(
        JSON.stringify({ success: true, mock: true, message: 'SMS simulated (Twilio not configured)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('SMS function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
