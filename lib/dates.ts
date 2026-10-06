export const WD = '日一二三四五六';

export function today() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date()).split('-').map(Number);
  return { y, m, d, key: `${y}-${String(m).padStart(2, '0')}` };
}
export const parseKey = (key: string): [number, number] => {
  const [y, m] = key.split('-').map(Number);
  return [y, m];
};
export const weekday = (key: string, d: number) => {
  const [y, m] = parseKey(key);
  return new Date(y, m - 1, d).getDay();
};
export const nextKey = (key: string) => {
  const [y, m] = parseKey(key);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
export const monthLabel = (key: string) => {
  const [y, m] = parseKey(key);
  return `${y}年${m}月`;
};
