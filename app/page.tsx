import HomeView from '../components/HomeView';
import { read } from '../lib/store';
import type { Doc } from '../lib/types';

// 每次開啟都讀最新公告的菜單
export const dynamic = 'force-dynamic';

export default async function Page() {
  let doc: Doc = { settings: {}, months: {} };
  let error = '';
  try { doc = await read(); } catch (e) { error = e instanceof Error ? e.message : '讀取失敗'; }
  return <HomeView doc={doc} error={error} />;
}
