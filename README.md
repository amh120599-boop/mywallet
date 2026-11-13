# MyWallet

Aplikasi personal finance local-first berbasis React + TypeScript + Vite, Dexie/IndexedDB, Recharts, Lucide, dan PWA manifest.

## Menjalankan secara lokal
1. Install Node.js 20+.
2. Jalankan `npm install`.
3. Jalankan `npm run dev`.
4. Buka URL lokal yang ditampilkan Vite.

## Fitur pada starter implementasi ini
- Dashboard saldo dan ringkasan income/expense bulan berjalan.
- Dompet default Indonesia dan tambah dompet.
- Pencatatan pemasukan/pengeluaran.
- Transfer antar dompet dengan validasi saldo dan transaksi atomik.
- Riwayat, pencarian, filter tipe, dan hapus transaksi.
- Ringkasan statistik dan breakdown kategori.
- Budget bulanan keseluruhan.
- Light/dark mode, sembunyikan saldo, nama pengguna.
- Backup/restore JSON tervalidasi dan export transaksi CSV.
- IndexedDB persisten dan manifest PWA.

## Catatan ruang lingkup
Ini adalah fondasi aplikasi yang dapat dijalankan dan dikembangkan, bukan klaim bahwa seluruh Master Prompt sudah selesai. Fitur yang masih perlu dikembangkan sebelum rilis produksi: edit transaksi/dompet, kategori custom, budget per kategori dan periode, kalender, recurring scheduler + catch-up, export XLSX, notifikasi terjadwal, service worker/offline cache, Supabase auth/RLS/cloud sync, konflik sinkronisasi, attachment, serta QA lintas perangkat dan browser. Saat ini belum dilakukan build/test di lingkungan Node karena dependensi perlu dipasang pada mesin pengembang.

## Prinsip data
Nominal disimpan sebagai integer Rupiah. Transfer disimpan sebagai dua entry berkaitan `transferGroupId`; transfer tidak masuk ke agregat income/expense. Data lokal berada di IndexedDB browser/perangkat, sehingga backup berkala disarankan.
