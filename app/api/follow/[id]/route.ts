import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { deactivateTrackedThread } from '@/lib/supabase';

interface Props {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: Props) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await deactivateTrackedThread(userId, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
