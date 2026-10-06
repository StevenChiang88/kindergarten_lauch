import { checkAdmin } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = checkAdmin(req);
  if (bad) return Response.json({ error: bad.error }, { status: bad.status });
  return Response.json({ ok: true });
}
