'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { WD, parseKey, today, weekday } from '../lib/dates';
import { isClosed, withDefaults, type Day, type Doc, type OpenDay } from '../lib/types';

type Age = 'all' | 'toddler' | 'baby';
type View = 'list' | 'month';

function Well({ area, label, text, extra }: { area: string; label: string; text: string; extra?: string }) {
  return (
    <div className={`well ${area}`}>
      <small>{label}</small>
      <b>{text || '—'}</b>
      {extra ? <em>{extra}</em> : null}
    </div>
  );
}

// 一天的餐點文字；age 為 all 時兩個年齡一起列出，各自加上標籤
function Meals({ day, age }: { day: OpenDay; age: Age }) {
  const sides = day.sides.filter(Boolean);
  const toddler = (
    <>
      <p className="main">{day.staple || '—'}</p>
      {sides.map((x) => <p key={x}>{x}</p>)}
      {day.soup ? <p>{day.soup}</p> : null}
      {day.snack ? <p className="snackline">{day.snack}</p> : null}
    </>
  );
  const baby = (
    <>
      <p className="main">{day.babyLunch[1] || '—'}</p>
      {day.babyLunch[0] ? <p className="sub">{`7–8個月：${day.babyLunch[0]}`}</p> : null}
      {day.babySnack ? <p className="snackline">{day.babySnack}</p> : null}
    </>
  );
  if (age === 'toddler') return toddler;
  if (age === 'baby') return baby;
  return (
    <>
      <div className="grp"><span className="tag">一歲以上</span>{toddler}</div>
      <div className="grp baby"><span className="tag">7–12個月</span>{baby}</div>
    </>
  );
}

function Tray({ day, age, label }: { day: OpenDay; age: 'toddler' | 'baby'; label?: string }) {
  let cls = 'tray';
  if (age === 'baby') cls += ' baby';
  else if (day.single) cls += day.soup ? ' single' : ' single nosoup';
  return (
    <>
      {label ? <p className="tray-label">{label}</p> : null}
      <div className={cls}>
        {age === 'baby' ? (
          <>
            <Well area="main" label="午餐" text={day.babyLunch[1]} extra={day.babyLunch[0] ? `7–8個月改吃 ${day.babyLunch[0]}` : undefined} />
            <Well area="snack" label="下午點心" text={day.babySnack} />
            <Well area="fruit" label="早點" text="水果泥、水果丁" />
          </>
        ) : day.single ? (
          <>
            <Well area="main" label="午餐" text={day.staple} />
            {day.soup ? <Well area="soup" label="湯" text={day.soup} /> : null}
            <Well area="snack" label="下午點心" text={day.snack} />
            <Well area="fruit" label="早點" text="季節水果" />
          </>
        ) : (
          <>
            <Well area="main" label="主食" text={day.staple} />
            <Well area="s0" label="配菜" text={day.sides[0]} />
            <Well area="s1" label="配菜" text={day.sides[1]} />
            <Well area="veg" label="時蔬" text="當季蔬菜" />
            <Well area="soup" label="湯" text={day.soup} />
            <Well area="snack" label="下午點心" text={day.snack} />
            <Well area="fruit" label="早點" text="季節水果" />
          </>
        )}
      </div>
    </>
  );
}

function DayCard({ month, day, age, now }: { month: string; day: Day; age: Age; now: { key: string; d: number } }) {
  const wd = weekday(month, day.d);
  const isToday = month === now.key && day.d === now.d;
  const past = month < now.key || (month === now.key && day.d < now.d);
  const cls = `day${isToday ? ' today' : ''}${past ? ' past' : ''}${isClosed(day) ? ' closed' : ''}`;
  const style = { '--col': wd } as CSSProperties;
  return (
    <div className={cls} style={style}>
      <div className="date">
        {day.d}
        <span>{`星期${WD[wd]}`}</span>
      </div>
      <div>{isClosed(day) ? <p>{day.closed || '停托'}</p> : <Meals day={day} age={age} />}</div>
    </div>
  );
}

// 整月：週一到週五五欄的月曆，一眼看完整個月
function MonthCalendar({ month, weeks, age, now }: { month: string; weeks: Day[][]; age: Age; now: { key: string; d: number } }) {
  return (
    <div className="cal-scroll">
      <div className="cal">
        {[1, 2, 3, 4, 5].map((n) => <div className="cal-head" key={n}><span>星期</span>{WD[n]}</div>)}
        {weeks.map((days) => [1, 2, 3, 4, 5].map((n) => {
          const day = days.find((d) => weekday(month, d.d) === n);
          if (!day) return <div className="cal-cell blank" key={`${days[0].d}-${n}`} />;
          const isToday = month === now.key && day.d === now.d;
          const cls = `cal-cell${isToday ? ' today' : ''}${isClosed(day) ? ' closed' : ''}`;
          return (
            <div className={cls} key={day.d}>
              <div className="cal-date">{day.d}</div>
              {isClosed(day) ? <p>{day.closed || '停托'}</p> : <Meals day={day} age={age} />}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

export default function HomeView({ doc, error }: { doc: Doc; error: string }) {
  const s = withDefaults(doc.settings);
  const now = today();
  const keys = Array.from(new Set([...Object.keys(doc.months), now.key])).sort();
  const [picked, setPicked] = useState<string | null>(null);
  const [savedAge, setSavedAge] = useState<Age>('all');
  const [view, setView] = useState<View>('list');
  const age: Age = s.showBaby ? savedAge : 'toddler';
  const month = picked && keys.includes(picked) ? picked : now.key;
  const i = keys.indexOf(month);
  const menu = doc.months[month];
  const [y, m] = parseKey(month);

  useEffect(() => {
    try {
      const a = localStorage.getItem('lunch-age');
      if (a === 'baby' || a === 'toddler') setSavedAge(a);
      if (localStorage.getItem('lunch-view') === 'month') setView('month');
    } catch {}
  }, []);
  useEffect(() => { document.title = `${m}月餐點表｜${s.siteName}`; }, [m, s.siteName]);

  const chooseAge = (a: Age) => {
    setSavedAge(a);
    try { localStorage.setItem('lunch-age', a); } catch {}
  };

  const chooseView = (v: View) => {
    setView(v);
    try { localStorage.setItem('lunch-view', v); } catch {}
  };

  let featured: OpenDay | undefined;
  let heading = '今天';
  const weeks = new Map<number, Day[]>();
  if (menu) {
    if (month === now.key) {
      const open = menu.days.filter((d): d is OpenDay => !isClosed(d));
      featured = open.find((d) => d.d === now.d);
      if (!featured) { featured = open.find((d) => d.d > now.d); heading = '下一個供餐日'; }
    }
    for (const d of menu.days) {
      const monday = d.d - ((weekday(month, d.d) + 6) % 7);
      const list = weeks.get(monday) ?? [];
      list.push(d);
      weeks.set(monday, list);
    }
  }

  return (
    <>
      <header className="top">
        <div>
          <div className="site">{`${s.siteName}　${y}年`}</div>
          <h1>{`${m}月餐點表`}</h1>
        </div>
        <div className="tools">
          {menu ? (
            <div className="seg" role="group" aria-label="顯示方式">
              <button type="button" aria-pressed={view === 'list'} onClick={() => chooseView('list')}>每日</button>
              <button type="button" aria-pressed={view === 'month'} onClick={() => chooseView('month')}>整月</button>
            </div>
          ) : null}
          {s.showBaby ? (
            <div className="seg" role="group" aria-label="年齡">
              <button type="button" aria-pressed={age === 'all'} onClick={() => chooseAge('all')}>全部</button>
              <button type="button" aria-pressed={age === 'toddler'} onClick={() => chooseAge('toddler')}>一歲以上</button>
              <button type="button" aria-pressed={age === 'baby'} onClick={() => chooseAge('baby')}>7–12個月</button>
            </div>
          ) : null}
          {keys.length > 1 ? (
            <div className="monthnav tools">
              <button type="button" disabled={i === 0} onClick={() => setPicked(keys[i - 1])}>上個月</button>
              <button type="button" disabled={i === keys.length - 1} onClick={() => setPicked(keys[i + 1])}>下個月</button>
            </div>
          ) : null}
        </div>
      </header>

      {error ? <p className="banner err">{`菜單讀取失敗：${error}`}</p> : null}

      {menu ? (
        <>
          {view === 'month' ? <MonthCalendar month={month} weeks={Array.from(weeks.values())} age={age} now={now} /> : null}
          {view === 'list' && featured ? (
            <section className="tray-wrap">
              <h2>{`${heading}　${m}月${featured.d}日 星期${WD[weekday(month, featured.d)]}`}</h2>
              {age !== 'baby' ? <Tray day={featured} age="toddler" label={age === 'all' ? '一歲以上' : undefined} /> : null}
              {age !== 'toddler' ? <Tray day={featured} age="baby" label={age === 'all' ? '7–12個月' : undefined} /> : null}
            </section>
          ) : null}
          {view === 'list' && Array.from(weeks.entries()).map(([monday, days]) => (
            <section className="week" key={monday}>
              <h3>{`${m}/${days[0].d}${days.length > 1 ? ` – ${m}/${days[days.length - 1].d}` : ''}`}</h3>
              <div className="days">
                {days.map((d) => <DayCard key={d.d} month={month} day={d} age={age} now={now} />)}
              </div>
            </section>
          ))}
          <p className="note">{s.note}</p>
        </>
      ) : (
        <div className="empty">
          <h2>{`${m}月的菜單還沒公告`}</h2>
          <p>公告後會顯示在這裡。</p>
        </div>
      )}

      <footer className="foot">
        <span>{menu ? `公告於 ${new Date(menu.publishedAt).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })}` : ''}</span>
        <a href="/admin">管理</a>
      </footer>
    </>
  );
}
