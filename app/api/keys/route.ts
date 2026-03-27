import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { encryptKey } from '@/lib/crypto';
import { upsertUserKey, deleteUserKey } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/keys — save or update the user's Anthropic API key
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

  if (!key.startsWith('sk-ant-') || key.length < 20) {
    return NextResponse.json({ error: 'invalid_key_format' }, { status: 400 });
  }

  // Validate key is active before storing
  try {
    const client = new Anthropic({ apiKey: key });
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    });
  } catch (err) {
    // SECURITY: Never forward raw Anthropic error to the client
    const error =
      err instanceof Anthropic.AuthenticationError ? 'invalid_key'
      : err instanceof Anthropic.PermissionDeniedError ? 'key_lacks_permissions'
      : 'key_validation_failed';
    return NextResponse.json({ error }, { status: 400 });
  }

  // Encrypt and persist — plaintext key exists only in this function scope
  try {
    const encrypted = encryptKey(key);
    const hint = key.slice(-4);
    await upsertUserKey(userId, encrypted, hint);
    // SECURITY: return only the hint — never echo the key or ciphertext
    return NextResponse.json({ hint }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}

// DELETE /api/keys — remove the user's stored key
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await deleteUserKey(userId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
