import type { Metadata } from 'next';
import PrintButton from '../../components/PrintButton';
import PrintSheet from '../../components/PrintSheet';
import { monthLabel, today } from '../../lib/dates';
import { read } from '../../lib/store';
import { withDefaults, type Doc } from '../../lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '餐點表列印版' };

// /print?month=YYYY-MM　沒指定就用本月，本月沒公告就用最新公告的月份
export default async function Page({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: asked } = await searchParams;
  let doc: Doc = { settings: {}, months: {} };
  let error = '';
  try { doc = await read(); } catch (e) { error = e instanceof Error ? e.message : '讀取失敗'; }

  const keys = Object.keys(doc.months).sort();
  const now = today().key;
  const month = asked && doc.months[asked] ? asked : doc.months[now] ? now : keys[keys.length - 1];
  const menu = month ? doc.months[month] : undefined;

  return (
    <>
      <div className="print-bar">
        <a href="/">回首頁</a>
        <span className="print-months">
          {keys.map((k) => (k === month ? <strong key={k}>{monthLabel(k)}</strong> : <a key={k} href={`/print?month=${k}`}>{monthLabel(k)}</a>))}
        </span>
        {menu ? <PrintButton /> : null}
      </div>
      {menu ? <p className="hint print-hint">按「下載 PDF」後，在列印視窗的目的地（印表機）選「另存為 PDF」，紙張選 A4。</p> : null}
      {error ? <p className="banner err">{`菜單讀取失敗：${error}`}</p> : null}
      {menu && month ? (
        <PrintSheet month={month} menu={menu} settings={withDefaults(doc.settings)} />
      ) : (
        <div className="empty">
          <h2>還沒有已公告的菜單</h2>
          <p>菜單公告後才能下載 PDF。</p>
        </div>
      )}
    </>
  );
}
