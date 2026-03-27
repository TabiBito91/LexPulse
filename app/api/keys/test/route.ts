import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let key: string;
  try {
    const body = await req.json();
    key = body?.key ?? '';
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (!key.startsWith('sk-ant-')) {
    return NextResponse.json(
      { valid: false, error: 'Key must start with sk-ant-' },
      { status: 200 },
    );
  }

  try {
    const client = new Anthropic({ apiKey: key });
    // Minimal call — 1 token, no tools, just validates key is active
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });
    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (err) {
    // SECURITY: Never forward raw Anthropic error messages to the client —
    // they can contain request metadata. Return generic codes only.
    const status =
      err instanceof Anthropic.AuthenticationError ? 401
      : err instanceof Anthropic.PermissionDeniedError ? 403
      : 0;

    const error =
      status === 401 ? 'invalid_key'
      : status === 403 ? 'key_lacks_permissions'
      : 'validation_failed';

    return NextResponse.json({ valid: false, error }, { status: 200 });
  }
}
