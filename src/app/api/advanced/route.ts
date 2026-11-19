import { NextResponse } from 'next/server';
const removed = () => NextResponse.json({ error: 'Fitur Produksi dan Operasional sudah dinonaktifkan.' }, { status: 410 });
export const GET = removed;
export const POST = removed;
