import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/apiAuthorization';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const denied = await authorizeApi(request);
  if (denied) return denied;
  const respond = (state: 'ready' | 'offline' | 'unconfigured') => NextResponse.json({ state }, { headers: { 'Cache-Control': 'no-store' } });
  const endpoint = process.env.LANGFLOW_API_URL;
  if (!endpoint || !process.env.LANGFLOW_API_KEY) return respond('unconfigured');
  try {
    const url = new URL(endpoint);
    // A local installation depends on both services. Never send credentials to health URLs.
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return respond('unconfigured');
    const responses = await Promise.all([fetch(new URL('/health', url), { cache: 'no-store', signal: AbortSignal.timeout(3000) }), fetch('http://127.0.0.1:11434/api/version', { cache: 'no-store', signal: AbortSignal.timeout(3000) })]);
    return respond(responses.every(r => r.ok) ? 'ready' : 'offline');
  } catch { return respond('offline'); }
}
