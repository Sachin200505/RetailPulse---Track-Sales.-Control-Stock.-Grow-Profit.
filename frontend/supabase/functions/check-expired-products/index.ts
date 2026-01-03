import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Find products that have expired (expiry_date <= today)
    const { data: expiredProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, name, sku, expiry_date, stock')
      .lte('expiry_date', today)
      .gt('stock', 0)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching expired products:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredProducts || expiredProducts.length === 0) {
      console.log('No expired products found');
      return new Response(
        JSON.stringify({ success: true, message: 'No expired products found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get owner's phone number for SMS
    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'owner')
      .single();

    let ownerPhone: string | null = null;
    if (ownerRole) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('mobile_number')
        .eq('id', ownerRole.user_id)
        .single();
      ownerPhone = ownerProfile?.mobile_number || null;
    }

    if (!ownerPhone) {
      console.log('Owner phone number not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Owner phone number not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build message for expired products
    const productList = expiredProducts.map(p => 
      `• ${p.name} (SKU: ${p.sku}) - Expired: ${p.expiry_date}`
    ).join('\n');

    const message = `🚨 RetailPulse EXPIRY ALERT:\n\n${expiredProducts.length} product(s) have expired:\n\n${productList}\n\nPlease remove these from sale immediately!`;

    // Format phone number for India
    const formattedPhone = ownerPhone.startsWith('+') ? ownerPhone : `+91${ownerPhone}`;

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

      console.log('Expiry alert SMS sent successfully:', result.sid);
      
      // Log audit entry
      await supabase.rpc('log_audit', {
        _action_type: 'expiry_alert_sent',
        _entity_type: 'products',
        _notes: `Expiry alert sent for ${expiredProducts.length} products`
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageSid: result.sid, 
          expiredCount: expiredProducts.length,
          products: expiredProducts.map(p => ({ id: p.id, name: p.name, expiryDate: p.expiry_date }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Mock SMS for development
      console.log('Mock expiry SMS sent:', { to: formattedPhone, message });
      return new Response(
        JSON.stringify({ 
          success: true, 
          mock: true, 
          message: 'SMS simulated (Twilio not configured)',
          expiredCount: expiredProducts.length,
          products: expiredProducts.map(p => ({ id: p.id, name: p.name, expiryDate: p.expiry_date }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Check expired products error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
