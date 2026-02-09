# Product Requirement Document (PRD): Aplikasi Pembayaran IPL Perumahan (MVP)

| Status | Versi | Tanggal | Pemilik Produk |
| :--- | :--- | :--- | :--- |
| Draft | 1.0 | 30 Januari 2026 | Tim Produk |

---

## 1. Pendahuluan
Aplikasi ini dirancang untuk mempermudah pengelolaan iuran warga (IPL) melalui sistem digital. Fokus utama MVP adalah pencatatan data warga, rumah, serta proses pembayaran manual yang diverifikasi oleh admin.

## 2. Target Pengguna
1. **Admin:** Pengurus perumahan yang mengelola master data dan keuangan.
2. **User (Warga):** Penghuni perumahan yang memiliki kewajiban membayar IPL.

## 3. Fitur Utama (Scope MVP)

### 3.1 Manajemen Autentikasi & Pengguna
* **Admin-Created User:** Admin mendaftarkan akun user secara manual melalui dashboard.
* **Default Password:** Sistem memberikan password bawaan (default) untuk login pertama kali.
* **Force Password Change:** User diwajibkan mengganti password setelah login pertama kali sebelum bisa mengakses fitur lainnya.

### 3.2 Dashboard Admin (Back-Office)
* **Manajemen User:** CRUD (Create, Read, Update, Delete) data akun warga.
* **Manajemen Rumah:** CRUD data rumah, termasuk nomor rumah, blok, dan kategori tipe rumah.
* **Master Harga Tipe Rumah:** Pengaturan harga IPL yang berbeda untuk setiap tipe (misal: Tipe 36, 45, dsb).
* **Approval Pembayaran:** Daftar antrean bukti transfer yang perlu diperiksa dan disetujui/ditolak oleh admin.

### 3.3 Dashboard User (Portal Warga)
* **Status Tagihan:** Menampilkan informasi iuran yang belum dibayar.
* **Upload Bukti Transfer:** Form pembayaran dengan opsi memilih jumlah bulan (misal: bayar 1 bulan, 3 bulan, atau 12 bulan).
* **Riwayat Pembayaran:** Daftar log transaksi pribadi beserta status verifikasinya.

---

## 4. Alur Kerja Sistem (User Journey)

### 4.1 Proses Onboarding
1. Admin mendaftarkan user dan rumah di dashboard.
2. User login menggunakan kredensial yang diberikan.
3. User melakukan reset password.

### 4.2 Proses Pembayaran
1. User melihat nominal tagihan berdasarkan **Tipe Rumah**.
2. User melakukan transfer manual ke rekening perumahan.
3. User memilih periode bulan pada aplikasi dan mengunggah foto bukti transfer.
4. Admin menerima notifikasi/list di dashboard.
5. Admin melakukan pengecekan mutasi bank.
6. Admin menekan tombol **Approve**.
7. Status iuran user berubah menjadi "Lunas" untuk periode tersebut.

---

## 5. Kebutuhan Data (Data Schema)

| Entitas | Atribut Utama |
| :--- | :--- |
| **Users** | ID, Nama, Email, Password, Role (Admin/User), FirstLoginStatus |
| **Houses** | ID, No_Rumah, Blok, Tipe_ID, User_ID (Owner) |
| **House_Types** | ID, Nama_Tipe, Harga_IPL |
| **Payments** | ID, User_ID, House_ID, Evidence_Image, Months_Paid, Total_Price, Status (Pending/Approved/Rejected) |

---

## 6. Aturan Bisnis (Business Rules)
1. **Perhitungan Tagihan:** $Total = HargaTipe \times JumlahBulan$.
2. **Pembayaran Multi-Bulan:** Sistem harus mencatat periode bulan secara berurutan (misal: bayar 2 bulan di Jan, maka Jan & Feb lunas).
3. **Keamanan:** User tidak dapat mengubah data rumah atau nominal harga IPL sendiri.
4. **Verifikasi:** Transaksi hanya akan dianggap sah jika admin sudah melakukan "Approval".

---

## 7. Indikator Keberhasilan (Success Metrics)
* Pengurangan kesalahan pencatatan iuran manual (buku besar/excel).
* Transparansi riwayat pembayaran bagi warga.
* Kecepatan proses verifikasi pembayaran oleh pengurus.

---