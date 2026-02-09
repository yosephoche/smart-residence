# Project Context: IPL Payment System (MVP)

Dokumen ini berfungsi sebagai panduan utama bagi Claude Code dalam mengimplementasikan aplikasi manajemen pembayaran IPL Perumahan.

## 1. Tech Stack (Core)
- **Frontend:** React/Next.js (Tailwind CSS)
- **Backend:** Node.js (Express) atau Laravel (Sesuai preferensi framework)
- **Database:** Supabase
- **Storage:** Local Storage (Development) / Cloudinary (Production) untuk Bukti Transfer.
- **Node Version:** run nvm use 22 for node version activate

## 2. Struktur Database (Schema)


[Image of an entity relationship diagram for a billing system]

### Entitas & Atribut:
- `users`: id, name, email, password, role (admin, user), is_first_login (default: true).
- `house_types`: id, type_name, price (decimal).
- `houses`: id, house_number, block, house_type_id (FK), user_id (FK).
- `payments`: id, user_id (FK), house_id (FK), amount_months, total_amount, proof_path, status (pending, approved, rejected), created_at.

## 3. Aturan Bisnis Penting (Crucial Rules)
1. **Perhitungan Harga:** Total bayar harus dihitung di backend berdasarkan `house_types.price` * `amount_months`. Jangan mengandalkan kalkulasi sisi client untuk keamanan.
2. **Autentikasi:** - Admin membuat user.
   - User pertama kali login wajib diarahkan ke `/change-password`.
   - Akses dashboard dibatasi berdasarkan `role`.
3. **Logika Pembayaran:**
   - User memilih jumlah bulan (1-12).
   - User mengunggah file gambar (JPG/PNG).
   - Admin memvalidasi secara manual. Status default transaksi adalah `pending`.

## 4. Prioritas Implementasi (Roadmap)
1. **Sprint 1: Auth & User Management**
   - Setup Database & Migrasi.
   - Fitur Admin: CRUD User & CRUD Rumah.
   - Fitur Login & Force Change Password.
2. **Sprint 2: Master Data & Transaction**
   - Setup CRUD Tipe Rumah & Harga.
   - User Dashboard: Form upload bukti transfer & pilih jumlah bulan.
3. **Sprint 3: Approval System**
   - Admin Dashboard: List transaksi pending.
   - Fitur Approval/Rejection.
   - History pembayaran bagi User.

## 5. Instruksi Khusus Claude Code
- Gunakan pendekatan **Modular Coding**. Pisahkan Controller, Route, dan Service.
- Pastikan setiap fungsi `upload` memiliki validasi tipe file dan ukuran (max 2MB).
- Gunakan Middleware untuk mengecek `is_first_login`. Jika `true`, blokir akses ke fitur lain kecuali ganti password.
- Sertakan penanganan error (error handling) yang jelas untuk setiap API response.
- Jangan menghapus data yang sudah ada jika melakukan fixing issue.
- Selalu gunakan node version 22, aktifkan melalui nvm command