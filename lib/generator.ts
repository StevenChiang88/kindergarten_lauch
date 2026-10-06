// 隨機菜單演算法
// 規則：
//  1. 同一個月內，同一道菜盡量不重複。
//  2. 同一天的主餐、配菜、湯、點心不撞主要食材（例如南瓜蒸蛋不配南瓜濃湯、蒸蛋不配蛋花湯）。
//  3. 飯＋配菜的日子：一道肉或魚＋一道蛋、豆製品或蔬菜；連續兩個供餐日不用同一種肉（雞／豬／魚）。
//     主食照原表固定：週二小米飯、週三地瓜飯、週四藜麥飯（週四偶爾換燕麥飯、糙米飯、奇亞籽飯）。
//  4. 單品主餐的日子：週一吃麵；週五以燉飯、炒飯、咖哩飯為主，約四次有一次是麵；
//     其他星期若設成單品主餐則麵飯各半。湯麵、麵線不再配湯。
//  5. 7–12個月寶寶的午餐只有粥糊或麵糊：大孩子吃麵的日子吃麵糊，其他日子吃粥糊，並盡量挑同食材的。
import { POOL } from './pool';
import { isClosed, type Day, type OpenDay } from './types';

export type Field = 'staple' | 'side0' | 'side1' | 'soup' | 'snack' | 'babyLunch' | 'babySnack';
export type PickState = { lastProtein?: string; wd?: number }; // wd：星期幾（1=一 … 5=五）
export type GenerateOptions = { singleDays?: number[]; bakeryDays?: number[]; closed?: Record<number, string> };

const KEYS: [string, string][] = [
  ['紅蘿蔔', '紅蘿蔔'], ['胡蘿蔔', '紅蘿蔔'], ['白蘿蔔', '蘿蔔'], ['蘿蔔', '蘿蔔'], ['馬鈴薯', '馬鈴薯'], ['玉米', '玉米'],
  ['南瓜', '南瓜'], ['蕃茄', '蕃茄'], ['洋蔥', '洋蔥'], ['絲瓜', '絲瓜'], ['大黃瓜', '大黃瓜'], ['小黃瓜', '小黃瓜'],
  ['黃瓜', '大黃瓜'], ['冬瓜', '冬瓜'], ['櫛瓜', '櫛瓜'], ['蒲仔', '蒲仔'], ['木耳', '木耳'], ['菇', '菇'], ['豆腐', '豆腐'],
  ['豆干', '豆干'], ['豆乾', '豆干'], ['豆丁', '豆干'], ['豆皮', '豆皮'], ['三色豆', '三色豆'], ['毛豆', '毛豆'],
  ['四季豆', '四季豆'], ['紅豆', '紅豆'], ['綠豆', '綠豆'], ['蛋', '蛋'], ['魚', '魚'], ['雞', '雞'], ['海帶', '海帶'],
  ['海芽', '海帶'], ['紫菜', '紫菜'], ['味噌', '味噌'], ['山藥', '山藥'], ['芋頭', '芋頭'], ['地瓜', '地瓜'], ['芹', '芹菜'],
  ['白菜', '白菜'], ['高麗菜', '高麗菜'], ['青花', '青花菜'], ['貢丸', '貢丸'], ['排骨', '排骨'], ['蓮子', '蓮子'],
  ['薏仁', '薏仁'], ['小米', '小米'], ['藜麥', '藜麥'], ['咖哩', '咖哩'],
];
const CORE_STAPLES = ['小米飯', '地瓜飯', '藜麥飯'];
const WEEKDAY_STAPLE: Record<number, string> = { 2: '小米飯', 3: '地瓜飯', 4: '藜麥飯' };
const THURSDAY_ALTERNATES = ['燕麥飯', '糙米飯', '奇亞籽飯'];

// 單品主餐這天要麵還是飯
function wantNoodle(wd: number | undefined): boolean {
  if (wd === 1) return true;
  if (wd === 5) return Math.random() < 0.25;
  return Math.random() < 0.5;
}
// 飯＋配菜這天的固定主食；沒有固定的星期回傳 undefined
function weekdayStaple(wd: number | undefined): string | undefined {
  if (wd === 4 && Math.random() < 0.15) return shuffle(THURSDAY_ALTERNATES)[0];
  return wd === undefined ? undefined : WEEKDAY_STAPLE[wd];
}

export function tags(text: string | undefined): Set<string> {
  const out = new Set<string>();
  let s = text || '';
  for (const [k, canon] of KEYS) {
    if (s.includes(k)) { out.add(canon); s = s.split(k).join(''); }
  }
  return out;
}
const overlap = (a: Set<string>, b: Set<string>) => { for (const x of a) if (b.has(x)) return true; return false; };
const protein = (s: string) => (s.includes('魚') ? '魚' : s.includes('雞') ? '雞' : '豬');
const isNoodle = (s: string) => s.includes('麵');
const needsSoup = (s: string) => !/湯麵|麵線|壽喜燒/.test(s);
const label = (x: string | string[]) => (Array.isArray(x) ? x.join('／') : x);

function shuffle<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// 依序放寬條件：沒用過且符合 → 符合 → 沒用過 → 任意
function pick<T extends string | string[]>(pool: T[], avoid: Set<string>, ok: (x: T) => boolean = () => true): T {
  const c = shuffle(pool);
  return c.find((x) => !avoid.has(label(x)) && ok(x)) ?? c.find(ok) ?? c.find((x) => !avoid.has(label(x))) ?? c[0];
}

function dayTags(day: OpenDay, except?: Field): Set<string> {
  const t = new Set<string>();
  const add = (f: Field, v: string | undefined) => { if (f !== except) for (const x of tags(v)) t.add(x); };
  add('staple', day.staple);
  add('side0', day.sides[0]);
  add('side1', day.sides[1]);
  add('soup', day.soup);
  add('snack', day.snack);
  return t;
}

export function usedNames(days: Day[]): Set<string> {
  const s = new Set<string>();
  for (const d of days) {
    if (isClosed(d)) continue;
    for (const v of [d.staple, ...d.sides, d.soup, d.snack, d.babySnack, d.babyLunch.join('／')]) if (v) s.add(v);
  }
  return s;
}

export function blankDay(d: number, single: boolean, bakery: boolean): OpenDay {
  return { d, single, bakery, staple: '', sides: [], soup: '', snack: '', babyLunch: ['', ''], babySnack: '' };
}

// 只重抽一格（直接改動傳入的 day）
export function reroll(day: OpenDay, field: Field, avoid: Set<string>, state: PickState = {}): OpenDay {
  const t = dayTags(day, field);
  const clash = (x: string) => !overlap(tags(x), t);
  const a = new Set(avoid);
  if (field === 'staple') {
    if (day.single) {
      const noodle = wantNoodle(state.wd);
      day.staple = pick(POOL.singles, a, (x) => clash(x) && isNoodle(x) === noodle);
      if (!needsSoup(day.staple)) day.soup = '';
    } else {
      a.add(day.staple);
      day.staple = pick(Math.random() < 0.2 ? POOL.staples : CORE_STAPLES, a);
    }
  } else if (field === 'side0') {
    day.sides[0] = pick(POOL.sidesMeat, a, (x) => clash(x) && protein(x) !== state.lastProtein);
  } else if (field === 'side1') {
    day.sides[1] = pick([...POOL.sidesEgg, ...POOL.sidesVeg], a, clash);
  } else if (field === 'soup') {
    day.soup = pick(POOL.soups, a, clash);
  } else if (field === 'snack') {
    if (day.bakery) {
      a.add(day.snack);
      day.snack = pick(POOL.snackBakery, a);
      day.babySnack = pick(POOL.babySnack, a);
    } else {
      const fresh = POOL.snacks.filter((p) => !a.has(p[1]));
      [day.babySnack, day.snack] = pick(fresh.length ? fresh : POOL.snacks, a, (p) => clash(p[1]));
    }
  } else if (field === 'babyLunch') {
    const lunch = dayTags(day, 'snack');
    // 大孩子吃麵的日子寶寶吃麵糊，其他日子吃粥糊；再從中挑同食材的
    const noodleDay = day.single && isNoodle(day.staple);
    const sameKind = POOL.babyLunch.filter((p) => isNoodle(p[0]) === noodleDay);
    const match = sameKind.filter((p) => overlap(tags(p[1]), lunch) && !a.has(label(p)));
    const chosen = match.length ? shuffle(match)[0] : pick(sameKind, a);
    day.babyLunch = [chosen[0], chosen[1]];
  } else {
    day.babySnack = pick([...POOL.babySnack, ...POOL.snacks.map((p) => p[0])], a);
  }
  return day;
}

// 重抽一整天（直接改動傳入的 day）
export function fillDay(day: OpenDay, avoid: Set<string>, state: PickState = {}): OpenDay {
  Object.assign(day, blankDay(day.d, day.single, day.bakery));
  reroll(day, 'staple', avoid, state);
  if (!day.single) day.staple = weekdayStaple(state.wd) ?? day.staple;
  if (day.single) {
    if (needsSoup(day.staple)) reroll(day, 'soup', avoid);
  } else {
    reroll(day, 'side0', avoid, state);
    reroll(day, 'side1', avoid);
    reroll(day, 'soup', avoid);
  }
  reroll(day, 'snack', avoid);
  reroll(day, 'babyLunch', avoid);
  return day;
}

// 星期：1=一 … 5=五
export function generateMonth(year: number, month: number, opts: GenerateOptions = {}): Day[] {
  const singleDays = opts.singleDays ?? [1, 5];
  const bakeryDays = opts.bakeryDays ?? [5];
  const closed = opts.closed ?? {};
  const days: Day[] = [];
  const avoid = new Set<string>();
  let lastProtein: string | undefined;
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (wd === 0 || wd === 6) continue;
    if (closed[d] !== undefined) { days.push({ d, closed: closed[d] }); continue; }
    const day = blankDay(d, singleDays.includes(wd), bakeryDays.includes(wd));
    fillDay(day, avoid, { lastProtein, wd });
    if (!day.single) lastProtein = protein(day.sides[0]);
    for (const n of usedNames([day])) if (!POOL.staples.includes(n)) avoid.add(n);
    days.push(day);
  }
  return days;
}
