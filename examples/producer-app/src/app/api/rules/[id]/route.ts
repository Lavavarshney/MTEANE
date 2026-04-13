import { NextRequest, NextResponse } from 'next/server';
import { triggrrFetch } from '@/lib/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const res = await triggrrFetch(`/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const res = await triggrrFetch(`/rules/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
