import { NextRequest, NextResponse } from 'next/server';
import { triggrrFetch } from '@/lib/server';

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString();
  const res = await triggrrFetch(`/logs${qs ? `?${qs}` : ''}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
