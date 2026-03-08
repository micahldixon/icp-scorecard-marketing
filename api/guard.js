/**
 * Guard: serves _app.html (in api/) only when a valid session cookie is present; not exposed as a static URL.
 * Used via vercel.json rewrite: / → /api/guard
 * Password is never in code; compare uses env SCORECARD_PASSWORD.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function verifySignedToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
    if (sig !== expectedSig) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;)\\s*${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  const token = getCookie(req, COOKIE_NAME);
  if (!verifySignedToken(token)) {
    res.setHeader('Location', '/login');
    return res.status(302).end();
  }

  const htmlPath = path.join(__dirname, '_app.html');
  let html;
  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch (err) {
    console.error('guard: failed to read _app.html', err);
    return res.status(500).send('Internal error');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
