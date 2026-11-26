import { NextResponse } from 'next/server';
import { version } from '../../../../package.json';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { version, revision: process.env.ERP_BUILD_REVISION || 'unidentified' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
