import { NextResponse } from 'next/server';
import { triggrrFetch } from '@/lib/server';

export async function GET() {
  const res = await triggrrFetch('/stats');
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
