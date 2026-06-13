/**
 * Vercel API endpoint that returns ops panel credentials
 * Called by ops.html on page load to auto-populate the config
 * Credentials come from Vercel env vars, never exposed in source code
 */

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return credentials from env vars
  // These are set in Vercel project settings and never committed to GitHub
  const config = {
    brainUrl: process.env.BRAIN_SUPABASE_URL || '',
    brainKey: process.env.BRAIN_SUPABASE_KEY || '',
    fschoolUrl: process.env.SUPABASE_URL || '',
    fschoolKey: process.env.SUPABASE_SERVICE_KEY || ''
  };

  // Check if all credentials are present
  if (!config.brainKey || !config.fschoolKey) {
    return res.status(200).json({ configured: false, config: {} });
  }

  res.status(200).json({ configured: true, config });
}
