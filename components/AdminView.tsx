'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { WD, monthLabel, nextKey, parseKey, today, weekday } from '../lib/dates';
import { blankDay, fillDay, generateMonth, reroll, usedNames, type Field } from '../lib/generator';
import { isClosed, withDefaults, type Day, type Doc, type OpenDay, type Settings } from '../lib/types';

type Draft = { month: string; days: Day[]; singleDays: number[]; bakeryDays: number[] };
type Flash = { type: 'ok' | 'err'; text: string; link?: boolean };
type Question = { title: string; text: string; ok: string; resolve: (yes: boolean) => void };
type TextField = 'staple' | 'side0' | 'side1' | 'soup' | 'snack' | 'babyLunch0' | 'babyLunch1' | 'babySnack';
type ApiError = Error & { status?: number };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const draftKey = (month: string) => `lunch-draft:${month}`;
const local = {
  get<T>(key: string): T | null {
    try { const v = localStorage.getItem(key); return v === null ? null : (JSON.parse(v) as T); } catch { return null; }
  },
  set(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

async function call<T>(method: string, path: string, body?: unknown, password?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (password !== undefined) headers['x-admin-password'] = encodeURIComponent(password);
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) {
    const e: ApiError = new Error(data?.error || `伺服器回應 ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}

function openDraft(month: string, doc: Doc): Draft {
  return local.get<Draft>(draftKey(month)) ?? {
    month, singleDays: [1, 5], bakeryDays: [5],
    days: doc.months[month] ? clone(doc.months[month].days) : [],
  };
}

function readText(day: OpenDay, f: TextField): string {
  if (f === 'side0') return day.sides[0] ?? '';
  if (f === 'side1') return day.sides[1] ?? '';
  if (f === 'babyLunch0') return day.babyLunch[0];
  if (f === 'babyLunch1') return day.babyLunch[1];
  return day[f];
}
function writeText(day: OpenDay, f: TextField, v: string) {
  if (f === 'side0') day.sides[0] = v;
  else if (f === 'side1') day.sides[1] = v;
  else if (f === 'babyLunch0') day.babyLunch[0] = v;
  else if (f === 'babyLunch1') day.babyLunch[1] = v;
  else day[f] = v;
}

function Confirm({ q, onDone }: { q: Question; onDone: (yes: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={() => onDone(false)}>
      <h2>{q.title}</h2>
      <p>{q.text}</p>
      <div className="row-actions">
        <button type="button" className="btn quiet" onClick={() => onDone(false)}>先不要</button>
        <button type="button" className="btn primary" onClick={() => onDone(true)}>{q.ok}</button>
      </div>
    </dialog>
  );
}

function Login({ onLogin }: { onLogin: (password: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await call('POST', '/api/auth', undefined, value);
      onLogin(value);
    } catch (err) { setError(err instanceof Error ? err.message : '登入失敗'); }
  };
  return (
    <form className="panel login" onSubmit={submit}>
      <h2>管理菜單</h2>
      {error ? <p className="banner err">{error}</p> : null}
      <label className="field">
        <span>管理密碼</span>
        <input type="password" autoComplete="current-password" required autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
      <div className="row-actions">
        <button className="btn primary">登入</button>
        <a href="/">回首頁</a>
      </div>
    </form>
  );
}

export default function AdminView() {
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<Doc>({ settings: {}, months: {} });
  const [password, setPassword] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState<Settings>(withDefaults(undefined));

  // 開頁：讀已公告的菜單，並試著用這次瀏覽階段記住的密碼登入
  useEffect(() => {
    (async () => {
      let loaded: Doc = { settings: {}, months: {} };
      try { loaded = await call<Doc>('GET', '/api/menu'); }
      catch (e) { setFlash({ type: 'err', text: e instanceof Error ? e.message : '讀取失敗' }); }
      setDoc(loaded);
      setForm(withDefaults(loaded.settings));
      const now = today();
      setDraft(openDraft(local.get<string>('lunch-admin-month') ?? (loaded.months[now.key] ? nextKey(now.key) : now.key), loaded));
      let saved: string | null = null;
      try { saved = sessionStorage.getItem('lunch-pw'); } catch {}
      if (saved !== null) {
        try { await call('POST', '/api/auth', undefined, saved); setPassword(saved); } catch {}
      }
      setReady(true);
    })();
  }, []);

  if (!ready || !draft) return <p className="loading">載入中…</p>;
  if (password === null) {
    return <Login onLogin={(p) => { setPassword(p); try { sessionStorage.setItem('lunch-pw', p); } catch {} }} />;
  }

  const s = withDefaults(doc.settings);
  const [y, m] = parseKey(draft.month);
  const published = doc.months[draft.month];
  const openCount = draft.days.filter((d) => !isClosed(d)).length;

  const ask = (title: string, text: string, ok: string) =>
    new Promise<boolean>((resolve) => setQuestion({ title, text, ok, resolve }));

  // 改草稿：複製一份、改動、存在這台裝置
  const change = (fn: (next: Draft) => void) => {
    const next = clone(draft);
    fn(next);
    local.set(draftKey(next.month), next);
    local.set('lunch-admin-month', next.month);
    setDraft(next);
  };
  const changeDay = (d: number, fn: (day: Day, all: Draft) => Day | void) =>
    change((next) => {
      const i = next.days.findIndex((x) => x.d === d);
      const out = fn(next.days[i], next);
      if (out) next.days[i] = out;
    });
  const others = (all: Draft, d: number) => usedNames(all.days.filter((x) => x.d !== d));

  const switchMonth = (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    local.set('lunch-admin-month', month);
    setFlash(null);
    setDraft(openDraft(month, doc));
  };

  const toggle = (key: 'singleDays' | 'bakeryDays', n: number, on: boolean) =>
    change((next) => { next[key] = on ? [...next[key], n] : next[key].filter((x) => x !== n); });

  const generate = async () => {
    if (draft.days.length && !(await ask('重新產生整個月？', '目前畫面上的菜單會被新的隨機結果取代，停托日會保留。已公告給家長的版本不受影響。', '重新產生'))) return;
    setFlash(null);
    change((next) => {
      const closed: Record<number, string> = {};
      for (const d of next.days) if (isClosed(d)) closed[d.d] = d.closed;
      next.days = generateMonth(y, m, { singleDays: next.singleDays, bakeryDays: next.bakeryDays, closed });
    });
  };

  const fail = (e: unknown) => {
    const err = e as ApiError;
    if (err.status === 401) { setPassword(null); try { sessionStorage.removeItem('lunch-pw'); } catch {} }
    setFlash({ type: 'err', text: err.message || '發生錯誤' });
    window.scrollTo(0, 0);
  };

  const publish = async () => {
    const text = published ? '家長首頁上這個月的菜單會立刻換成這一份。' : '公告後家長在首頁就看得到這一份菜單。';
    if (!(await ask(`公告${monthLabel(draft.month)}菜單？`, text, '公告菜單'))) return;
    try {
      setDoc(await call<Doc>('PUT', '/api/menu', { month: draft.month, menu: { days: draft.days } }, password));
      setFlash({ type: 'ok', text: `已公告${monthLabel(draft.month)}菜單。`, link: true });
      window.scrollTo(0, 0);
    } catch (e) { fail(e); }
  };

  const saveSettings = async () => {
    try {
      const body = { settings: { siteName: form.siteName.trim(), note: form.note.trim(), showBaby: form.showBaby } };
      setDoc(await call<Doc>('PUT', '/api/menu', body, password));
      setFlash({ type: 'ok', text: '已儲存設定。' });
      window.scrollTo(0, 0);
    } catch (e) { fail(e); }
  };

  const cell = (day: OpenDay, label: string, field: TextField, roll: Field, baby = false) => (
    <label className={baby ? 'cell baby' : 'cell'} key={field}>
      <span>{label}</span>
      <input type="text" maxLength={40} value={readText(day, field)}
        onChange={(e) => { const v = e.target.value; changeDay(day.d, (x) => { if (!isClosed(x)) writeText(x, field, v); }); }} />
      <button type="button" className="dice" title={`重抽${label}`} aria-label={`重抽${label}`}
        onClick={() => changeDay(day.d, (x, all) => { if (!isClosed(x)) reroll(x, roll, others(all, x.d), { wd: weekday(all.month, x.d) }); })}>🎲</button>
    </label>
  );

  const card = (day: Day) => {
    const wd = weekday(draft.month, day.d);
    const title = <strong>{`${m}/${day.d}（${WD[wd]}）`}</strong>;
    if (isClosed(day)) {
      return (
        <section className="edit closed" key={day.d}>
          <header>
            {title}
            <input className="reason" type="text" maxLength={30} value={day.closed} placeholder="停托原因，例如：雙十節停托一日" aria-label="停托原因"
              onChange={(e) => { const v = e.target.value; changeDay(day.d, () => ({ d: day.d, closed: v })); }} />
            <button type="button" className="mini"
              onClick={() => changeDay(day.d, (_x, all) => fillDay(blankDay(day.d, all.singleDays.includes(wd), all.bakeryDays.includes(wd)), others(all, day.d), { wd }))}>
              恢復供餐
            </button>
          </header>
        </section>
      );
    }
    return (
      <section className="edit" key={day.d}>
        <header>
          {title}
          <button type="button" className="mini"
            onClick={() => changeDay(day.d, (x, all) => { if (!isClosed(x)) { x.single = !x.single; fillDay(x, others(all, x.d), { wd }); } })}>
            {day.single ? '改成飯＋配菜' : '改成單品主餐'}
          </button>
          <button type="button" className="mini" onClick={() => changeDay(day.d, (x, all) => { if (!isClosed(x)) fillDay(x, others(all, x.d), { wd }); })}>整天重抽</button>
          <button type="button" className="mini" onClick={() => changeDay(day.d, () => ({ d: day.d, closed: '' }))}>設為停托</button>
        </header>
        <div className="cells">
          {cell(day, day.single ? '午餐主餐' : '主食', 'staple', 'staple')}
          {day.single ? null : cell(day, '配菜（肉、魚）', 'side0', 'side0')}
          {day.single ? null : cell(day, '配菜（蛋、豆、蔬菜）', 'side1', 'side1')}
          {cell(day, '湯', 'soup', 'soup')}
          {cell(day, '下午點心', 'snack', 'snack')}
          {s.showBaby ? cell(day, '寶寶午餐（7–8個月）', 'babyLunch0', 'babyLunch', true) : null}
          {s.showBaby ? cell(day, '寶寶午餐（9–12個月）', 'babyLunch1', 'babyLunch', true) : null}
          {s.showBaby ? cell(day, '寶寶點心', 'babySnack', 'babySnack', true) : null}
        </div>
      </section>
    );
  };

  const checks = (legend: string, key: 'singleDays' | 'bakeryDays') => (
    <fieldset className="checks">
      <legend>{legend}</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n}>
          <input type="checkbox" checked={draft[key].includes(n)} onChange={(e) => toggle(key, n, e.target.checked)} />
          {` 星期${WD[n]}`}
        </label>
      ))}
    </fieldset>
  );

  return (
    <>
      <header className="top">
        <div>
          <div className="site">{s.siteName}</div>
          <h1>管理菜單</h1>
        </div>
        <a href="/">回首頁</a>
      </header>

      {flash ? (
        <p className={flash.type === 'err' ? 'banner err' : 'banner'}>
          {flash.text}
          {flash.link ? <> <a href="/">看首頁</a></> : null}
        </p>
      ) : null}

      <section className="panel">
        <h2>產生菜單</h2>
        <label className="field narrow">
          <span>月份</span>
          <input type="month" value={draft.month} onChange={(e) => switchMonth(e.target.value)} />
        </label>
        {checks('吃單品主餐（湯麵、燉飯、炒飯）的日子', 'singleDays')}
        {checks('點心吃麵包、飯糰配豆漿的日子', 'bakeryDays')}
        <div className="row-actions">
          <button type="button" className="btn primary" onClick={generate}>{draft.days.length ? '重新隨機產生整個月' : '隨機產生整個月'}</button>
          <span className="hint">{published ? `${monthLabel(draft.month)}已公告過，再次公告會取代它。` : `${monthLabel(draft.month)}還沒公告。`}</span>
        </div>
      </section>

      {draft.days.length ? (
        <section>
          <p className="hint">每一格都可以直接改字，或按 🎲 只重抽那一格。改好再按最下面的「公告菜單」。</p>
          {draft.days.map(card)}
        </section>
      ) : (
        <div className="empty">
          <h2>這個月還沒有菜單</h2>
          <p>按「隨機產生整個月」開始。</p>
        </div>
      )}

      <section className="panel spaced">
        <h2>網站設定</h2>
        <label className="field">
          <span>網站名稱</span>
          <input type="text" maxLength={30} value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
        </label>
        <label className="field">
          <span>首頁底下的說明</span>
          <textarea rows={9} maxLength={800} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <label className="checkline">
          <input type="checkbox" checked={form.showBaby} onChange={(e) => setForm({ ...form, showBaby: e.target.checked })} />
          {' 顯示 7–12 個月寶寶的餐點'}
        </label>
        <button type="button" className="btn" onClick={saveSettings}>儲存設定</button>
      </section>

      {draft.days.length ? (
        <div className="publishbar">
          <span>{`${monthLabel(draft.month)}　${openCount} 個供餐日`}</span>
          <button type="button" className="btn primary" onClick={publish}>公告菜單</button>
        </div>
      ) : null}

      {question ? <Confirm q={question} onDone={(yes) => { question.resolve(yes); setQuestion(null); }} /> : null}
    </>
  );
}
