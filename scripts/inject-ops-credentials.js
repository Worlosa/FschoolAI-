#!/usr/bin/env node

/**
 * Inject Supabase credentials into ops.html during Vercel build
 * This script runs AFTER the build and modifies the deployed ops.html
 * to include default credentials from env vars, so users don't need to enter them manually
 */

import fs from 'fs';
import path from 'path';

const opsPath = path.join(process.cwd(), '.vercel/output/static/ops.html');

// Check if ops.html exists (it should be in the static output after build)
if (!fs.existsSync(opsPath)) {
  console.log('⚠️  ops.html not found at', opsPath, '- skipping credential injection');
  process.exit(0);
}

const brainUrl = process.env.BRAIN_SUPABASE_URL || 'https://qiolhlvqfzujnkwnymft.supabase.co';
const brainKey = process.env.BRAIN_SUPABASE_KEY || '';
const fschoolUrl = process.env.SUPABASE_URL || 'https://wqgxpouhbwhwpzudrptp.supabase.co';
const fschoolKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!brainKey || !fschoolKey) {
  console.log('⚠️  Missing Supabase env vars - ops panel will require manual credential entry');
  process.exit(0);
}

// Read the ops.html file
let html = fs.readFileSync(opsPath, 'utf-8');

// Create a script that sets the default credentials in localStorage
// This runs before the app loads, so credentials are already set
const credentialScript = `
<script>
// Auto-load credentials from env (injected during build)
const defaultCreds = {
  brainUrl: "${brainUrl}",
  brainKey: "${brainKey}",
  fschoolUrl: "${fschoolUrl}",
  fschoolKey: "${fschoolKey}"
};
// Only set if not already in localStorage (user can override)
if (!localStorage.getItem('ops_credentials')) {
  localStorage.setItem('ops_credentials', JSON.stringify(defaultCreds));
}
</script>
`;

// Inject the script right after <body> tag
html = html.replace('<body>', '<body>' + credentialScript);

// Write the modified HTML back
fs.writeFileSync(opsPath, html);

console.log('✅ Ops panel credentials injected - users will auto-connect on first visit');
