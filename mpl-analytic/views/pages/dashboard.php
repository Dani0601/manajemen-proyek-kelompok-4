<?php
$pageTitle = 'Dashboard Analitik | MLBB Guide';
$pageDescription = 'Statistik meta hero dan jadwal pertandingan MPL.';
$pageCss = 'dashboard.css';
$pageJs = 'dashboard.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$baseUrl = defined('BASE_URL') ? BASE_URL : rtrim(
    str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')),
    '/'
);
if ($baseUrl === '.') {
    $baseUrl = '';
}

// Seluruh data dashboard diambil dari GET /api/dashboard oleh dashboard.js.
// Markup di bawah hanya kerangka: daftar hero, grafik, dan jadwal diisi JS.
// Panel Top 5 memakai satu struktur yang sama.
$heroPanels = [
    ['id' => 'wr', 'list' => 'top-win-rate',  'title' => 'Top 5 Overpowered (WR)'],
    ['id' => 'br', 'list' => 'top-ban-rate',  'title' => 'Top 5 Most Banned (BR)'],
    ['id' => 'pr', 'list' => 'top-pick-rate', 'title' => 'Top 5 Pick Rate (PR)'],
];
?>

<div
    id="dashboard"
    class="dash is-page-loading"
    data-asset-base="<?= $assetBase ?>"
    data-state="loading"
>

    <h1 class="visually-hidden">Dashboard Analitik</h1>

    <!-- Konten dashboard. Disembunyikan dashboard.js saat galat satu halaman. -->
    <div id="dashboard-content" class="dash__content">

        <!-- BANNER: desktop hanya gambar; teks sambutan hanya tampil di mobile (sesuai Figma) -->
        <section class="dash-banner" aria-label="Banner dashboard">
            <img
                class="dash-banner__image"
                src="<?= $assetBase ?>/images/banners/dashboard-banner.png"
                alt=""
                width="1084"
                height="320"
            >

            <div class="dash-banner__content">
                <p class="dash-banner__title">Selamat datang<br>di MLBB Guide</p>
                <p class="dash-banner__text">Temukan hero terbaik, build item,<br>dan strategi untuk menang!</p>
            </div>
        </section>

        <!-- TOP 5 WR, BR, PR -->
        <?php foreach ($heroPanels as $panel): ?>
            <section class="dash-section" data-dash-section="<?= $panel['id'] ?>" aria-labelledby="<?= $panel['id'] ?>-title">
                <div class="dash-section__header">
                    <h2 id="<?= $panel['id'] ?>-title" class="dash-section__title">
                        <?= htmlspecialchars($panel['title'], ENT_QUOTES, 'UTF-8') ?>
                    </h2>
                </div>

                <div class="dash-panel" data-dash-panel>
                    <ol
                        id="<?= $panel['list'] ?>"
                        class="dash-heroes"
                        aria-labelledby="<?= $panel['id'] ?>-title"
                    ></ol>

                    <!-- Tempat skeleton / data kosong (diisi dashboard.js) -->
                    <div class="dash-state-slot" hidden></div>
                </div>
            </section>
        <?php endforeach; ?>

        <!-- GRAFIK WR vs BR (Chart.js, data dari API) -->
        <section class="dash-section" data-dash-section="chart" aria-labelledby="chart-title">
            <div class="dash-section__header">
                <h2 id="chart-title" class="dash-section__title">Perbandingan WR dan BR</h2>
            </div>

            <div class="dash-panel dash-chart" data-dash-panel>
                <ul class="dash-legend">
                    <li><span class="dash-legend__box dash-legend__box--wr"></span>Win Rate</li>
                    <li><span class="dash-legend__box dash-legend__box--br"></span>Ban Rate</li>
                </ul>

                <div class="dash-chart__canvas">
                    <canvas
                        id="win-ban-chart"
                        role="img"
                        aria-label="Grafik perbandingan Win Rate dan Ban Rate hero"
                    >
                        Grafik perbandingan Win Rate dan Ban Rate.
                    </canvas>
                </div>

                <div class="dash-state-slot" hidden></div>
            </div>
        </section>

        <!-- JADWAL PERTANDINGAN -->
        <section class="dash-section" data-dash-section="schedule" aria-labelledby="schedule-title">
            <div class="dash-section__header">
                <h2 id="schedule-title" class="dash-section__title">Jadwal Pertandingan</h2>
                <a class="dash-section__link" href="<?= htmlspecialchars($baseUrl . '/tournament', ENT_QUOTES, 'UTF-8') ?>">
                    Lihat Semua <span aria-hidden="true">&rsaquo;</span>
                </a>
            </div>

            <ul
                id="match-schedule"
                class="dash-panel dash-matches"
                data-dash-panel
                aria-labelledby="schedule-title"
            >
                <li class="dash-state-slot" hidden></li>
            </ul>
        </section>
    </div>

    <!-- LOADING satu halaman: "Memuat Dashboard" (Figma Dashboard - state loading) -->
    <p id="dashboard-status" class="dash-loading-text dash-loading-text--page" role="status" aria-live="polite">
        <span class="dash-spinner" aria-hidden="true"></span>
        <span>Memuat Dashboard</span>
    </p>

    <!-- ERROR satu halaman (Figma Dashboard-Eror) -->
    <section id="dashboard-error" class="dash-error" role="alert" hidden>
        <span class="dash-error__icon" aria-hidden="true">!</span>
        <h2 class="dash-error__title">Gagal memuat data</h2>
        <p class="dash-error__text">
            Terjadi kesalahan saat mengambil data.<br>
            Periksa koneksi internet Anda dan coba lagi.
        </p>
        <button type="button" class="dash-error__button" data-dash-retry>Coba Lagi</button>
    </section>

    <noscript>
        <p class="dash-noscript">Aktifkan JavaScript untuk melihat dashboard.</p>
    </noscript>
</div>

<!-- Chart.js untuk grafik, bukan gambar statis (versi dipatok) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

<script src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/js/api-client.js?v=<?= (int) @filemtime(BASE_PATH . '/public/assets/js/api-client.js') ?>"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
