import { checkAdmin } from '../../../lib/auth';
import { NotConfigured, read, write } from '../../../lib/store';
import type { Day, Settings } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const str = (v: unknown, max = 40) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanDay(x: unknown): Day | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const d = Number(o.d);
  if (!Number.isInteger(d) || d < 1 || d > 31) return null;
  if (o.closed !== undefined && o.closed !== null) return { d, closed: str(o.closed, 30) || '停托' };
  const pair = Array.isArray(o.babyLunch) ? o.babyLunch : [];
  return {
    d,
    single: !!o.single,
    bakery: !!o.bakery,
    staple: str(o.staple),
    sides: (Array.isArray(o.sides) ? o.sides : []).slice(0, 3).map((s) => str(s)),
    soup: str(o.soup),
    snack: str(o.snack),
    babyLunch: [str(pair[0]), str(pair[1])],
    babySnack: str(o.babySnack),
  };
}

function cleanSettings(s: Record<string, unknown>): Settings {
  return { siteName: str(s.siteName, 30), note: str(s.note, 800), showBaby: s.showBaby !== false };
}

function fail(e: unknown) {
  if (e instanceof NotConfigured) return json({ error: e.message }, 503);
  console.error(e);
  return json({ error: '伺服器發生錯誤，請稍後再試' }, 500);
}

export async function GET() {
  try { return json(await read()); } catch (e) { return fail(e); }
}

// body: { month: 'YYYY-MM', menu: { days } } 公告某個月；{ settings } 儲存網站設定；兩者可同時給
export async function PUT(req: Request) {
  const bad = checkAdmin(req);
  if (bad) return json({ error: bad.error }, bad.status);
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const doc = await read();
    if (body.settings && typeof body.settings === 'object') doc.settings = cleanSettings(body.settings as Record<string, unknown>);
    if (body.month !== undefined) {
      const month = String(body.month);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: '月份格式不正確' }, 400);
      const raw = (body.menu as { days?: unknown } | undefined)?.days;
      const days = (Array.isArray(raw) ? raw : []).slice(0, 31).map(cleanDay).filter((d): d is Day => d !== null);
      if (!days.length) return json({ error: '菜單是空的' }, 400);
      doc.months[month] = { days, publishedAt: new Date().toISOString() };
    }
    await write(doc);
    return json(doc);
  } catch (e) { return fail(e); }
}
