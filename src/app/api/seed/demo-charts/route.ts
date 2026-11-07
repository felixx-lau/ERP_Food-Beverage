import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/apiAuthorization';
export async function POST(request: NextRequest) {
  const denied = await authorizeApi(request); if (denied) return denied;
  return NextResponse.json({ error: 'Data demo hanya boleh dibuat pada database pengujian terisolasi melalui CLI.' }, { status: 403 });
}
