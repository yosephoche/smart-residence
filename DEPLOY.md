# Panduan Deploy SmartResidence ke Vercel

Dokumen ini mencakup seluruh langkah dari repo lokal hingga aplikasi berjalan di produksi Vercel, termasuk migrasi upload ke Cloudinary.

---

## Prasyarat

Sebelum memulai, pastikan semua akun dan alat di bawah sudah siap:

| Kebutuhan | Keterangan |
|---|---|
| **Akun Vercel** | Buat di [vercel.com](https://vercel.com) |
| **Akun GitHub** | Repo harus di-push ke GitHub |
| **Akun Supabase** | Sudah ada — pastikan project dan database aktif |
| **Akun Cloudinary** | Buat baru di [cloudinary.com](https://cloudinary.com) — gratis tier cukup untuk MVP |
| **Node.js 22** | Wajib. Aktifkan lokal via `source ~/.nvm/nvm.sh && nvm use 22` |

---

## Langkah 1 — Pastikan Repo Bersih & Push ke GitHub

Sebelum menghubungkan ke Vercel, pastikan file sensitif tidak ikut ke-commit.

1. Verifikasi `.gitignore` di root proyek minimal berisi:

```
node_modules/
.next/
.env
.env.local
public/uploads/
```

2. Pastikan `.env` atau `.env.local` **tidak** sudah ter-track oleh git:

```bash
git rm --cached .env .env.local 2>/dev/null
```

3. Commit dan push semua perubahan ke branch utama (misal `main`):

```bash
git add .
git commit -m "chore: prepare repo for Vercel deployment"
git push origin main
```

---

## Langkah 2 — Buat Proyek di Vercel & Hubungkan Repo

1. Login ke [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **New Project** → pilih repo GitHub yang berisi SmartResidence.
3. Vercel auto-detect framework sebagai **Next.js** — biarkan default.
4. Buka **Build & Output Settings** dan set:
   - **Node.js Version:** `22.x`
   - **Build Command:** kosongkan dulu (akan diubah di Langkah 6).
   - **Output Directory:** `.next` (default Next.js, biarkan).
5. Jangan deploy dulu — lanjut ke Langkah 3 untuk mengisi env vars terlebih dahulu.

---

## Langkah 3 — Set Environment Variables di Vercel Dashboard

Buka tab **Settings → Environment Variables** di proyek Vercel. Tambahkan variabel berikut:

### Database (Supabase via Prisma)

| Variabel | Nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://...?sslmode=require` | Connection string **pooler** Supabase (port `6543`). Copi dari Supabase Dashboard → Settings → Connection Strings → URI (Transaction pooler). |
| `DIRECT_URL` | `postgresql://...` | Connection string **direct** Supabase (port `5432`). Digunakan oleh `prisma migrate deploy`. Copi dari URI (Direct connection). |

### Auth (NextAuth / Auth.js)

| Variabel | Nilai | Keterangan |
|---|---|---|
| `NEXTAUTH_SECRET` | *(string random, min 32 karakter)* | Generate via `openssl rand -base64 32` di terminal lokal. |
| `NEXTAUTH_URL` | `https://<domain-vercel-anda>.vercel.app` | URL produksi tanpa trailing slash. Perbarui setelah domain custom dipasang. |

### Cloudinary (Upload Bukti Transfer)

Nilai-nilai berikut didapat dari **Cloudinary Dashboard → API Keys**:

| Variabel | Nilai |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloud name Anda |
| `CLOUDINARY_API_KEY` | API Key |
| `CLOUDINARY_API_SECRET` | API Secret |

> **Tips:** Set semua variabel di environment **Production**. Untuk testing, buat branch terpisah dan set di environment **Preview**.

---

## Langkah 4 — Migrasi Upload ke Cloudinary

Saat ini upload bukti transfer disimpan di `./public/uploads/payments` (lokal filesystem). Di Vercel, filesystem tidak persisten antar-deployment, sehingga upload **harus** dialihkan ke Cloudinary.

### 4.1 Install paket Cloudinary

```bash
source ~/.nvm/nvm.sh && nvm use 22
npm install cloudinary
```

### 4.2 Update `lib/utils/file-upload.ts`

Buka file `lib/utils/file-upload.ts`. Fungsi `saveUploadedFile()` saat ini menulis file ke disk menggunakan `fs` dan `sharp`. Ganti logika penyimpanan dengan Cloudinary SDK.

**Langkah konkret:**

1. Tambahkan import dan konfigurasi Cloudinary di bagian atas file:

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

2. Di dalam `saveUploadedFile()`, ganti blok yang menulis ke `fs` dengan:

```typescript
// Konversi file Buffer menjadi base64 data URI
const arrayBuffer = await file.arrayBuffer();
const base64 = Buffer.from(arrayBuffer).toString("base64");
const dataUri = `data:${file.type};base64,${base64}`;

// Upload ke Cloudinary; folder "payments" untuk pengelolaan mudah
const result = await cloudinary.uploader.upload(dataUri, {
  folder: "smartresidence/payments",
  // Gunakan sharp (jika masih dipakai) atau biarkan Cloudinary transformasi otomatis
});

return result.secure_url; // HTTPS URL yang dikembalikan Cloudinary
```

3. Pastikan **return value** fungsi adalah `secure_url` (string). Semua bagian kode yang menyimpan path proof (`proof_path` di database) akan otomatis menyimpan URL Cloudinary.

4. Hapus variabel `UPLOAD_DIR` dari `.env.example` dan `.env.local` karena sudah tidak digunakan.

### 4.3 Commit & Push

```bash
git add .
git commit -m "feat: migrate file upload from local fs to Cloudinary"
git push origin main
```

---

## Langkah 5 — Konfigurasi Build Command & Migrasi Prisma

Vercel menjalankan `prisma generate` dan migrasi secara otomatis jika build command dikonfigurasi dengan benar.

### 5.1 Set Build Command di Vercel

Buka **Settings → General → Build & Output Settings** di proyek Vercel. Set **Build Command** menjadi:

```
prisma generate && next build
```

Ini memastikan:
- `prisma generate` → regenerasi Prisma Client dari `schema.prisma` sebelum build.
- `next build` → compile aplikasi Next.js.

### 5.2 Jalankan Migrasi Database

Migrasi Prisma (`prisma migrate deploy`) **tidak** dijalankan otomatis di Vercel. Jalankan secara manual **satu kali** sebelum atau setelah deploy pertama, menggunakan salah satu cara:

**Opsi A — Via Supabase CLI (direkomendasikan):**

```bash
# Dari mesin lokal, pastikan DIRECT_URL sudah di-set di .env.local
npx prisma migrate deploy
```

Pastikan `DIRECT_URL` di `.env.local` mengarah ke Supabase direct connection (port `5432`).

**Opsi B — Via Vercel Build Hook (jika Opsi A tidak memungkinkan):**

Ubah build command menjadi:

```
prisma migrate deploy && prisma generate && next build
```

> **Catatan:** Opsi B menggunakan `DATABASE_URL` dari env Vercel. Pastikan variabel sudah tersimpan sebelum trigger deploy.

---

## Langkah 6 — Deploy & Verifikasi End-to-End

1. Kembali ke Vercel Dashboard → klik **Deployments** → **Redeploy** (atau push baru ke `main` untuk trigger deploy otomatis).
2. Tunggu build selesai. Perhatikan log untuk error dari Prisma atau Next.js.
3. Buka URL produksi (`https://<domain>.vercel.app`) dan jalankan verifikasi berikut:

### Checklist Verifikasi

- [ ] **Login** — Admin dan user biasa dapat login dengan credential yang ada.
- [ ] **Force change password** — User baru yang belum ganti password diarahkan ke `/change-password`.
- [ ] **Upload bukti transfer** — User melakukan pembayaran, upload foto bukti (JPG/PNG). Cek di Cloudinary Dashboard bahwa file masuk ke folder `smartresidence/payments`.
- [ ] **Approval flow** — Admin dapat melihat payment `pending`, approve atau reject. Status berubah dengan benar.
- [ ] **Data persisten** — Setelah refresh halaman, data payment dan user tetap ada (menandakan database connection benar).

---

## Checklist Pasca-Deploy

Setelah aplikasi berjalan dan terverifikasi:

- [ ] **Domain custom** — Tambahkan domain custom di Vercel Settings → Domains. Update `NEXTAUTH_URL` env var sesuai domain baru.
- [ ] **SSL** — Vercel mengaktifkan SSL otomatis untuk custom domain. Pastikan sertifikat valid.
- [ ] **Monitoring** — Pantau Vercel Analytics dan Logs. Pertimbangkan menambahkan error monitoring (misal Sentry) untuk produksi.
- [ ] **Env var review** — Pastikan tidak ada secret yang ter-expose di log atau source code.

---

## Troubleshooting

### Prisma: Error P6021 — "connection pool"

```
PrismaClientKnownRequestError: P6021: Timed out waiting for a connection from the pool.
```

**Penyebab:** Terlalu banyak koneksi database terbuka. Di serverless (Vercel), setiap function invocation bisa membuka koneksi baru.

**Solusi:**
- Pastikan `DATABASE_URL` menggunakan **transaction pooler** Supabase (port `6543`), bukan direct connection.
- Tambahkan `?sslmode=require` di akhir connection string.
- Jika masih terjadi, tambahkan `connection_limit=5` di query string `DATABASE_URL`:
  ```
  postgresql://...?sslmode=require&connection_limit=5
  ```

---

### Sharp: Binary tidak ditemukan

```
Error: Something went wrong in the sharp binding. Most likely you are missing out the sharp dynamic library.
```

**Penyebab:** `sharp` menggunakan native binary yang platform-spesifik. Build di mesin lokal (macOS) tidak cocok dengan runtime Vercel (Linux).

**Solusi:**
- Tambahkan `.next/` dan `node_modules/.cache` ke `.gitignore` (jangan push cache build lokal).
- Di Vercel, pastikan build dimulai dari scratch (`Settings → General → tampilkan "Clear Cache and Override"`).
- Vercel Next.js deployment sudah mendukung `sharp` secara native — pastikan versi `sharp` di `package.json` terbaru.

---

### NextAuth: Callback URL Error / Redirect Loop

```
Error: [next-auth] Missing NEXTAUTH_URL or callback URL mismatch
```

**Penyebab:** `NEXTAUTH_URL` tidak cocok dengan URL yang diakses browser.

**Solusi:**
- Set `NEXTAUTH_URL` di env Vercel menjadi URL produksi yang **persis** diakses (termasuk protocol `https://`, tanpa trailing slash).
- Jika menggunakan custom domain, update `NEXTAUTH_URL` setelah domain aktif.
- Untuk Preview deployment, set `NEXTAUTH_URL` di environment `Preview` dengan URL preview yang sesuai, atau gunakan `VERCEL_URL` env var yang disediakan Vercel secara otomatis.

### NextAuth: Session Callback Errors / Infinite Redirect Loop

**Symptoms:** App continuously redirects to login page, or shows Vercel login instead of app

**Common Causes:**
1. `NEXTAUTH_SECRET` not set or doesn't match between environments
2. `NEXTAUTH_URL` is incorrect or still pointing to localhost
3. JWT token corruption due to environment variable mismatch
4. Database user not found (token contains deleted user ID)

**Solutions:**
- Verify `NEXTAUTH_SECRET` is set in Vercel env vars (generate new with `openssl rand -base64 32`)
- Verify `NEXTAUTH_URL` matches exact production URL (https://your-domain.vercel.app)
- Clear browser cookies/localStorage and try fresh login
- Check Vercel logs for "[Auth] Invalid session token" errors
- If user was deleted from DB during dev/testing, log out all sessions and re-create user

**For Preview Deployments:**
- Don't set NEXTAUTH_URL for Preview environment (let it auto-detect from VERCEL_URL)
- Or set to: `https://$VERCEL_URL` (Vercel will substitute automatically)
