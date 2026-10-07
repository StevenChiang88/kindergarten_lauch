import { WD, parseKey, weekday } from '../lib/dates';
import { isClosed, type MonthMenu, type Settings } from '../lib/types';

// 照紙本餐點表的格式排成一張 A4 表格，給列印和存 PDF 用
export default function PrintSheet({ month, menu, settings }: { month: string; menu: MonthMenu; settings: Settings }) {
  const [y, m] = parseKey(month);
  const baby = settings.showBaby;
  const restSpan = baby ? 7 : 5; // 水果欄之後的欄數，停托日整列合併用
  const mm = String(m).padStart(2, '0');
  const [py, pm, pd] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date(menu.publishedAt)).split('-');

  // 時蔬欄照紙本把同一週連續的「飯＋配菜」日合併成一格
  const isRice = (i: number) => { const d = menu.days[i]; return !!d && !isClosed(d) && !d.single; };
  const startsWeek = (i: number) => i > 0 && weekday(month, menu.days[i].d) < weekday(month, menu.days[i - 1].d);
  const vegSpan = menu.days.map((_, i) => {
    if (!isRice(i) || (isRice(i - 1) && !startsWeek(i))) return 0;
    let n = 1;
    while (isRice(i + n) && !startsWeek(i + n)) n++;
    return n;
  });

  return (
    <div className="sheet-scroll">
      <div className="sheet">
        <h1>{`${settings.siteName}　${y - 1911}年${mm}月份餐點表`}</h1>
        <table>
          <colgroup>
            <col style={{ width: '3.5%' }} />
            <col style={{ width: '3.5%' }} />
            <col style={{ width: '3.5%' }} />
            {baby ? <col style={{ width: '23%' }} /> : null}
            <col style={{ width: '7.5%' }} />
            <col />
            <col style={{ width: '7.5%' }} />
            <col style={{ width: '11%' }} />
            {baby ? <col style={{ width: '10.5%' }} /> : null}
            <col style={{ width: '11.5%' }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={3}>日期</th>
              <th rowSpan={3}>星期</th>
              <th rowSpan={3}>早點水果</th>
              <th colSpan={baby ? 5 : 4}>中午餐點</th>
              <th colSpan={baby ? 2 : 1}>下午點心</th>
            </tr>
            <tr>
              {baby ? <th rowSpan={2}>7～12個月</th> : null}
              <th colSpan={4}>一歲以上</th>
              {baby ? <th rowSpan={2}>7～12個月</th> : null}
              <th rowSpan={2}>{baby ? '12個月以上' : '內容'}</th>
            </tr>
            <tr>
              <th>主食</th>
              <th>配菜</th>
              <th>時蔬</th>
              <th>湯品</th>
            </tr>
          </thead>
          <tbody>
            {menu.days.map((day, i) => {
              const wd = weekday(month, day.d);
              const newWeek = startsWeek(i);
              const fruit = i === 0 ? (
                <td rowSpan={menu.days.length} className="fruit"><span>每天供應新鮮季節性水果</span><small>7-8M<br />(泥)<br />9M-3Y<br />(丁、片)</small></td>
              ) : null;
              if (isClosed(day)) {
                return (
                  <tr key={day.d} className={newWeek ? 'wk' : undefined}>
                    <td>{day.d}</td>
                    <td>{WD[wd]}</td>
                    {fruit}
                    <td colSpan={restSpan} className="closed">{day.closed || '停托'}</td>
                  </tr>
                );
              }
              const sides = day.sides.filter(Boolean).join('、');
              return (
                <tr key={day.d} className={newWeek ? 'wk' : undefined}>
                  <td>{day.d}</td>
                  <td>{WD[wd]}</td>
                  {fruit}
                  {baby ? <td>{day.babyLunch.filter(Boolean).join('／')}</td> : null}
                  {day.single ? (
                    <td colSpan={day.soup ? 3 : 4}>{day.staple}</td>
                  ) : (
                    <>
                      <td>{day.staple}</td>
                      <td>{sides}</td>
                      {vegSpan[i] ? <td rowSpan={vegSpan[i]}>當季蔬菜</td> : null}
                    </>
                  )}
                  {day.single && !day.soup ? null : <td>{day.soup}</td>}
                  {baby ? <td>{day.babySnack}</td> : null}
                  <td>{day.snack}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="sheet-note">{settings.note}</p>
        <p className="sheet-date">{`日期：${Number(py) - 1911}.${pm}.${pd}`}</p>
      </div>
    </div>
  );
}
