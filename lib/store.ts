// 菜單存放處：Vercel 上用 Upstash Redis（REST），本機開發用 .data/menu.json
import fs from 'node:fs';
import path from 'node:path';
import type { Doc } from './types';

const KEY = 'lunch-menu:v1';
const FILE = path.join(process.cwd(), '.data', 'menu.json');
const MISSING = '尚未連接資料庫：請在 Vercel 專案的 Storage 加入 Upstash Redis，然後重新部署。';

export class NotConfigured extends Error {}

const env = () => ({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function kv(command: string[]): Promise<string | null> {
  const { url, token } = env();
  const r = await fetch(url as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`資料庫回應 ${r.status}`);
  return (await r.json()).result;
}

function normalize(doc: Partial<Doc> | null): Doc {
  return { settings: doc?.settings ?? {}, months: doc?.months ?? {} };
}

export async function read(): Promise<Doc> {
  const { url, token } = env();
  if (url && token) {
    const v = await kv(['GET', KEY]);
    return normalize(v ? JSON.parse(v) : null);
  }
  if (process.env.VERCEL) throw new NotConfigured(MISSING);
  try { return normalize(JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch { return normalize(null); }
}

export async function write(doc: Doc): Promise<void> {
  const { url, token } = env();
  if (url && token) { await kv(['SET', KEY, JSON.stringify(doc)]); return; }
  if (process.env.VERCEL) throw new NotConfigured(MISSING);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(doc, null, 1));
}
