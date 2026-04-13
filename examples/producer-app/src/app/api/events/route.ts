import { NextRequest, NextResponse } from 'next/server';
import { triggrrFetch } from '@/lib/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await triggrrFetch('/events', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
