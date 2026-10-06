import crypto from 'node:crypto';

// 通過回傳 null，否則回傳要給前端的錯誤
// 之後要改成多人登入，換掉這個函式就好，其他地方只認它的回傳值。
export function checkAdmin(req: Request): { status: number; error: string } | null {
  const expected = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? '' : 'admin');
  if (!expected) return { status: 503, error: '尚未設定管理密碼：請在 Vercel 專案的 Environment Variables 加入 ADMIN_PASSWORD，然後重新部署。' };
  let given = '';
  try { given = decodeURIComponent(req.headers.get('x-admin-password') || ''); } catch {}
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b) ? null : { status: 401, error: '密碼不正確' };
}
