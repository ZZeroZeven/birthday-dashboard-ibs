# Birthday Upcoming Dashboard

Dashboard GitHub Pages untuk melihat ulang tahun yang akan datang.

## Fitur
- Nama, tanggal lahir, dan angkatan
- Pencarian nama
- Filter bulan dan tanggal ulang tahun
- Filter angkatan
- Excel tetap private di Google Drive
- Login password menggunakan GitHub Actions Secret
- Update data otomatis setiap hari

## Setup Secrets
Repository -> Settings -> Secrets and variables -> Actions:

- `GOOGLE_DRIVE_FILE_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `DASHBOARD_PASSWORD`

Excel Google Drive harus dibagikan ke service-account sebagai Viewer.

## Pages
Settings -> Pages -> Source: **GitHub Actions**.

## Penting tentang login
GitHub Pages adalah static hosting. Password Secret tidak bisa langsung dibaca browser. Workflow memakai `DASHBOARD_PASSWORD` untuk membuat SHA-256 hash di `public/auth.json`; password asli tidak dimasukkan ke frontend. Ini adalah proteksi UI, bukan autentikasi server-side. Karena situs Pages publik, `data.json` juga publik.

## Data
Workflow membaca sheet `MAIN` dan kolom `Nama Siswa`, `Tanggal Lahir`, dan `ANGKATAN`. File Excel tidak disimpan di repository.
