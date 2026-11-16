# MPL-ANALYTIC

Proyek mata kuliah Manajemen Proyek Perangkat Lunak (MPPL), Kelompok 4.
Aplikasi analitik data MPL ID: data pemain, tim, jadwal, klasemen, detail pertandingan, dan perbandingan hero.

## Kesepakatan Git

Aturan di bagian ini berlaku mulai Sprint 4 dan dipakai oleh seluruh anggota.

### 1. Strategi branching: feature branch

- Cabang `main` selalu berisi kode yang jalan. Tidak ada commit langsung ke `main`.
- Setiap card di board dikerjakan di satu cabang sendiri, lalu digabung ke `main` lewat pull request.

### 2. Format nama cabang

Satu card satu cabang, dengan format:

```
awalan/nomor-card-deskripsi-singkat
```

Huruf kecil, kata dipisahkan tanda hubung. Contoh:

```
feat/12-filter-tanggal
fix/27-login-gagal-email-kosong
feat/9-halaman-data-player-mpl-id
```

Membuat cabang:

```
git checkout main
git pull
git checkout -b feat/12-filter-tanggal
```

### 3. Format pesan commit

```
awalan(#nomor-card): deskripsi singkat
```

| Awalan | Dipakai untuk | Contoh |
|---|---|---|
| `feat` | Menambah kemampuan baru yang dilihat pengguna | `feat(#12): tambah filter tanggal pada daftar transaksi` |
| `fix` | Memperbaiki defect | `fix(#27): tangani email kosong saat login` |
| `test` | Menambah atau memperbaiki pengujian | `test(#12): tambah boundary value untuk filter tanggal` |
| `refactor` | Merapikan kode tanpa mengubah perilakunya | `refactor(#12): pisahkan logika filter ke fungsi sendiri` |
| `docs` | Mengubah dokumentasi atau README | `docs: tulis konvensi branching kelompok` |
| `chore` | Pekerjaan penunjang: dependensi, konfigurasi, pipeline | `chore: tambah workflow GitHub Actions untuk test` |

Commit kecil dan sering. Awalan `docs` dan `chore` boleh tanpa nomor card.

### 4. Aturan pull request

- Setiap pull request butuh **satu persetujuan dari anggota lain**.
- **Penulis kode tidak boleh menyetujui pull request-nya sendiri.**
- Pull request yang menunggu lebih dari satu hari dibahas di daily standup.
- Pull request digabung ke `main` hanya setelah disetujui.

Reviewer memeriksa:
1. Apakah yang dikerjakan sesuai dengan isi card?
2. Apakah ada bagian yang tidak dipahami dan perlu dijelaskan?
3. Apakah ada kode yang tidak dipakai atau sisa percobaan yang lupa dihapus?
4. Apakah pull request ini membuat sesuatu yang sudah jalan menjadi rusak?

### 5. Continuous integration

GitHub Actions disiapkan oleh **Dawwas Zakka Sutiono**, paling lambat **13 November 2026**. Rinciannya dicatat di card board.

### 6. Tag baseline

Kondisi akhir Sprint 3 ditandai dengan tag **`v0.3-sprint3`** pada commit `42c4114`.

```
git tag -a v0.3-sprint3 42c4114 -m "Baseline akhir Sprint 3"
git push origin v0.3-sprint3
```

Kalau terjadi kesalahan deploy atau merge, kembali ke titik ini:

```
git checkout v0.3-sprint3
```

## Perjalanan satu card

| Kolom board | Yang terjadi di repository |
|---|---|
| Sprint Backlog | Belum ada cabang. Card masih menunggu. |
| In Progress | Cabang dibuat, commit kecil dan sering. |
| Ready to Test | Pull request dibuka, reviewer mulai membaca. Belum digabung ke `main`. |
| QA Testing | Penguji menjalankan test case di Qase terhadap cabang itu. |
| Design Review | Product Owner memeriksa hasilnya terhadap isi card. |
| Done | Pull request disetujui dan digabung. Baru di titik ini pekerjaan dihitung di velocity. |

## Identitas Git anggota

Supaya commit tercatat atas nama yang benar di GitHub, setiap anggota mengatur ini sekali di komputernya, memakai email yang terdaftar dan terverifikasi di akun GitHub:

```
git config --global user.name "Nama Lengkap"
git config --global user.email "email-akun-github@contoh.com"
```
