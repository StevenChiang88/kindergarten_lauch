export type OpenDay = {
  d: number;
  single: boolean; // 單品主餐（湯麵、燉飯…），false 為飯＋配菜
  bakery: boolean; // 點心是麵包、飯糰配豆漿
  staple: string;
  sides: string[];
  soup: string;
  snack: string;
  babyLunch: [string, string];
  babySnack: string;
};
export type ClosedDay = { d: number; closed: string };
export type Day = OpenDay | ClosedDay;
export type MonthMenu = { days: Day[]; publishedAt: string };
export type Settings = { siteName: string; note: string; showBaby: boolean };
export type Doc = { settings: Partial<Settings>; months: Record<string, MonthMenu> };

export const isClosed = (day: Day): day is ClosedDay => 'closed' in day;

export const DEFAULT_SETTINGS: Settings = {
  siteName: '托育餐點表',
  showBaby: true,
  note: [
    '早點每天供應新鮮季節性水果（7–8個月吃泥，9個月–3歲吃丁、片）；飯＋配菜的日子另有一道當季蔬菜。',
    '＊寶寶第一次副食品以米糊為主，讓寶寶練習接觸副食品，並依序增添蔬菜、蛋白質類及水果。（若寶貝在家已開始嘗試副食品，請先告知人員以便調整。）',
    '＊寶寶四～六個月開始食用副食品，提供一天一餐單一食材；副食品除了增加寶貝對於營養的攝取，對寶貝的口腔、口語及肌肉發展都有幫助。',
    '＊餐點表中寶寶未進食過的食物，請在家提早進行嘗試，若寶寶有身體不適或產生過敏現象，請告知家園人員以方便留意並觀察。',
    '＊因應災害或市場波動，家園會挑選幼兒已嘗試過之食材做調整，會於當日電子聯絡簿上告知！',
    '＊水果及蔬菜會於當日在聯絡簿上告知。',
    '＊每月最後一週，公告次月餐點表。',
  ].join('\n'),
};

export function withDefaults(s: Partial<Settings> | undefined): Settings {
  return {
    siteName: s?.siteName || DEFAULT_SETTINGS.siteName,
    note: s?.note || DEFAULT_SETTINGS.note,
    showBaby: s?.showBaby ?? DEFAULT_SETTINGS.showBaby,
  };
}
