# 托育餐點表

給家長看的每月餐點表，Next.js（App Router）＋ TypeScript。首頁顯示本月菜單，`/admin` 可以隨機產生整個月的菜單、逐格修改，確認後公告到首頁。

## 檔案

| 路徑 | 用途 |
|---|---|
| `app/page.tsx` | 首頁，每次開啟都從資料庫讀最新菜單 |
| `app/admin/page.tsx` | 管理頁 |
| `app/print/page.tsx` | 列印版（照紙本格式的 A4 表格，用瀏覽器列印存成 PDF） |
| `app/api/menu/route.ts` | 讀取、公告菜單，儲存網站設定 |
| `app/api/auth/route.ts` | 驗證管理密碼 |
| `components/` | 首頁與管理頁的畫面 |
| `lib/pool.ts` | 品項資料池，要增減菜色改這裡 |
| `lib/generator.ts` | 隨機菜單演算法，規則寫在檔案開頭 |
| `lib/store.ts` | 菜單存放處（Vercel 上是 Upstash Redis，本機是 `.data/menu.json`） |
| `lib/auth.ts` | 管理權限檢查，之後要改成多人登入換這裡 |

## 本機預覽

```
npm install
npm run dev
```

打開 http://localhost:3000 ，管理頁在 `/admin`，本機密碼是 `admin`。

## 部署到 Vercel

1. 把這個資料夾推到 GitHub，在 Vercel 匯入成新專案，會自動偵測為 Next.js。
2. 專案的 Storage 分頁新增一個 Upstash Redis 資料庫並連到這個專案。連好後 Environment Variables 會多出 `KV_REST_API_URL`、`KV_REST_API_TOKEN`（或 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`，兩組名稱程式都認得）。
3. Environment Variables 新增 `ADMIN_PASSWORD`，值是管理頁要用的密碼。
4. 重新部署一次，讓環境變數生效。

少了第 2 步首頁會顯示讀取失敗的原因，少了第 3 步登入時會顯示缺哪一項。
