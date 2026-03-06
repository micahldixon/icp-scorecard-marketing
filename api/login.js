/**
 * POST /api/login — Check password (env), set signed httpOnly session cookie, redirect.
 * Password from SCORECARD_PASSWORD only; constant-time compare to prevent timing attacks.
 */

const crypto = require('crypto');
const querystring = require('querystring');

const COOKIE_NAME = 'scorecard_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters');
  }
  return secret;
}

function createSignedToken() {
  const payload = {
    t: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  if (bufA.length === 0) return true;
  return crypto.timingSafeEqual(bufA, bufB);
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const expectedPassword = process.env.SCORECARD_PASSWORD;
  if (!expectedPassword) {
    console.error('login: SCORECARD_PASSWORD not set');
    res.setHeader('Location', '/login?error=1');
    return res.status(302).end();
  }

  let provided = null;
  if (req.body && typeof req.body.password === 'string') {
    provided = req.body.password;
  } else {
    try {
      const body = await getBody(req);
      const parsed = querystring.parse(body);
      provided = parsed.password;
    } catch (e) {
      res.setHeader('Location', '/login?error=1');
      return res.status(302).end();
    }
  }
  if (provided == null || typeof provided !== 'string') {
    res.setHeader('Location', '/login?error=1');
    return res.status(302).end();
  }

  if (!timingSafeEqual(provided.trim(), expectedPassword)) {
    res.setHeader('Location', '/login?error=1');
    return res.status(302).end();
  }

  const token = createSignedToken();
  const isProd = process.env.VERCEL_ENV === 'production';
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=' + Math.floor(SESSION_MAX_AGE_MS / 1000),
  ];
  if (isProd) cookie.push('Secure');
  res.setHeader('Set-Cookie', cookie.join('; '));
  res.setHeader('Location', '/');
  return res.status(302).end();
};
