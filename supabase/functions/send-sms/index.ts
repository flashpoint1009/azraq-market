type SmsPayload = {
  to: string;
  body: string;
  fallbackWhatsapp?: boolean;
};

Deno.serve(async (request) => {
  try {
    const payload = await request.json() as SmsPayload;
    const sid = Deno.env.get('TWILIO_SID');
    const token = Deno.env.get('TWILIO_TOKEN');
    const from = Deno.env.get('TWILIO_FROM');

    if (!sid || !token || !from) {
      return Response.json({ ok: false, provider: 'twilio', message: 'Twilio secrets are not configured' }, { status: 200 });
    }

    const body = new URLSearchParams({
      To: payload.to,
      From: from,
      Body: payload.body,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      return Response.json({ ok: false, provider: 'twilio', fallback: Boolean(payload.fallbackWhatsapp) }, { status: 200 });
    }

    return Response.json({ ok: true, provider: 'twilio' });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});
