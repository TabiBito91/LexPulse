import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { addTrackedThread, getTrackedThreadCount, getTrackedThreads } from '@/lib/supabase';

const MAX_TRACKED_THREADS = 10;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const threads = await getTrackedThreads(userId);
    return NextResponse.json({ threads });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { title: string; sourceUrl?: string; topicArea?: string; searchQuery: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { title, sourceUrl, topicArea, searchQuery } = body;
  if (!title?.trim() || !searchQuery?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  try {
    const count = await getTrackedThreadCount(userId);
    if (count >= MAX_TRACKED_THREADS) {
      return NextResponse.json({ error: 'limit_reached', limit: MAX_TRACKED_THREADS }, { status: 422 });
    }

    const thread = await addTrackedThread(userId, {
      title: title.trim(),
      source_url: sourceUrl ?? null,
      topic_area: topicArea ?? null,
      search_query: searchQuery.trim(),
    });
    return NextResponse.json({ thread }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
