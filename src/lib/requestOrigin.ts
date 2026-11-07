import { NextRequest } from 'next/server';

export function hasAllowedOrigin(request:NextRequest):boolean {
  const origin=request.headers.get('origin');
  if(!origin||request.method==='GET')return true;
  // NextURL normalizes loopback IPs to localhost. Compare against the actual
  // request Host as well so a form opened at 127.0.0.1 remains same-origin.
  const host=request.headers.get('host');
  return origin===request.nextUrl.origin || (!!host && origin===`${request.nextUrl.protocol}//${host}`);
}
