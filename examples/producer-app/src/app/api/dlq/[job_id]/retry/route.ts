import { NextResponse } from 'next/server';
import { triggrrFetch } from '@/lib/server';

type Params = { params: Promise<{ job_id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { job_id } = await params;
  const res = await triggrrFetch(`/dlq/${job_id}/retry`, { method: 'POST' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
