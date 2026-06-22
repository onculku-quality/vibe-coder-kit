// Supabase Edge Function: verify-subscription
// Faz 9: Google Play abonelik satin almasini sunucuda dogrular.
//
// Akis:
// 1. Mobil uygulama (react-native-iap) Play'den purchase token alir.
// 2. Bu fonksiyona POST ile gonderir: Authorization: Bearer <jwt> +
//    { purchase_token, product_id, offer_id?, institution_id }.
// 3. JWT dogrulanir ve cagri yapan kullanicinin:
//      - platform_admini, VEYA
//      - belirtilen institution_id'nin admin'i
//    oldugu kontrol edilir.
// 4. Service account (Google Play Developer API) ile token dogrulanir.
// 5. Dogrulama basarili ise ilgili kurumun abonelik durumu Supabase'de guncellenir.
//
// ONEMLI:
// - Service account JSON anahtari Supabase secret olarak saklanir (asla uygulamaya gomulmez):
//     supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{ ... }'
// - RTDN (Real-time developer notifications) webhook'u ile yenileme/iptal olaylari ayri bir
//   edge function (play-rtdn-webhook) ile islenir.
//
// Bu dosya bir ISKELETTIR. Google Play Developer API entegrasyonu (googleapis / jose ile
// JWT imzalama) yayinlama asamasinda tamamlanir. Asagidaki akis referans icindir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface VerifyRequest {
  purchase_token: string;
  product_id: string;
  offer_id?: string;
  institution_id: string;
}

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '';
const MAX_PURCHASE_TOKEN_LEN = 4096;
const MAX_PRODUCT_ID_LEN = 256;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin =
    ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN;
  return {
    ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Yalnizca POST desteklenir.' }), {
      status: 405,
      headers: corsHeaders(origin),
    });
  }

  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Yetkilendirme basligi eksik veya gecersiz.' }),
        { status: 401, headers: corsHeaders(origin) }
      );
    }
    const accessToken = match[1].trim();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Sunucu yapilandirmasi eksik.' }),
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userErr,
    } = await adminClient.auth.getUser(accessToken);
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Gecersiz veya suresi dolmus oturum.' }),
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const body = (await req.json()) as Partial<VerifyRequest>;
    if (
      !body.purchase_token ||
      !body.product_id ||
      !body.institution_id
    ) {
      return new Response(
        JSON.stringify({ error: 'Eksik parametre: purchase_token, product_id, institution_id gerekli.' }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    if (
      typeof body.purchase_token !== 'string' ||
      body.purchase_token.length > MAX_PURCHASE_TOKEN_LEN
    ) {
      return new Response(
        JSON.stringify({ error: 'purchase_token gecersiz uzunlukta.' }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    if (
      typeof body.product_id !== 'string' ||
      body.product_id.length === 0 ||
      body.product_id.length > MAX_PRODUCT_ID_LEN
    ) {
      return new Response(
        JSON.stringify({ error: 'product_id gecersiz.' }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    if (
      body.offer_id !== undefined &&
      (typeof body.offer_id !== 'string' || body.offer_id.length > MAX_PRODUCT_ID_LEN)
    ) {
      return new Response(
        JSON.stringify({ error: 'offer_id gecersiz.' }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    if (typeof body.institution_id !== 'string' || !UUID_RE.test(body.institution_id)) {
      return new Response(
        JSON.stringify({ error: 'institution_id gecersiz.' }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, role, institution_id')
      .eq('id', user.id)
      .single();
    if (profileErr || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Cagri yapan kullanicinin profili bulunamadi.' }),
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const isPlatformAdmin = callerProfile.role === 'platform_admini';
    const isInstitutionAdmin =
      callerProfile.role === 'admin' &&
      callerProfile.institution_id === body.institution_id;
    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return new Response(
        JSON.stringify({ error: 'Bu islemi yapmaya yetkiniz yok.' }),
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    if (!Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')) {
      return new Response(
        JSON.stringify({ error: 'Service account yapilandirilmamis.' }),
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // TODO (yayinlama asamasi):
    // 1. Service account ile OAuth2 access token al (googleapis token API, scope:
    //    https://www.googleapis.com/auth/androidpublisher).
    // 2. purchases.subscriptionsv2.get ile purchase_token dogrula.
    // 3. Yanittan: subscription state, expiryTime, lineItems bilgilerini cikar.
    // 4. Supabase'de ilgili institution kaydini guncelle:
    //    - subscription_status = 'active' (gecerliyse) / 'expired' / 'cancelled'
    //    - subscription_active_until = expiryTime
    //    - play_purchase_token = purchase_token
    //    - play_subscription_id = product_id

    const { error: logErr } = await adminClient.from('activity_logs').insert({
      institution_id: body.institution_id,
      actor_id: user.id,
      action: 'Abonelik dogrulama istegi (iskelet)',
      target_type: 'institution',
      target_id: body.institution_id,
      meta: { product_id: body.product_id, offer_id: body.offer_id ?? null },
    });
    if (logErr) {
      console.warn('[verify-subscription] aktivite logu yazilamadi:', logErr);
    }

    return new Response(
      JSON.stringify({
        verified: false,
        note: 'verify-subscription iskelet asamasinda. Google Play Developer API entegrasyonu tamamlanmadi.',
      }),
      { status: 501, headers: corsHeaders(origin) }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Dogrulama hatasi.';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  }
});
