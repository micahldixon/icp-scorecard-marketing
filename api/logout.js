/**
 * GET /api/logout — Clear session cookie and redirect to login.
 */

const COOKIE_NAME = 'scorecard_session';

module.exports = function handler(req, res) {
  const clearCookie = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
  ].join('; ');
  res.setHeader('Set-Cookie', clearCookie);
  res.setHeader('Location', '/login');
  return res.status(302).end();
};
