
<?php
$pageTitle = 'Dashboard Analitik | MLBB Guide';
$pageDescription = 'Statistik meta hero dan jadwal pertandingan MPL.';
$pageCss = 'dashboard.css';
$pageJs = 'dashboard.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');

$baseUrl = rtrim(
    str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')),
    '/'
);
?>

<div class="dash" id="dashboard" data-state="loading">
    <h1 class="visually-hidden">Dashboard Analitik</h1>

    <section class="dash-banner" aria-label="Banner dashboard">
        <img
            class="dash-banner__image"
            src="<?= $assetBase ?>/images/banners/dashboard-banner.png"
            alt=""
            width="1084"
            height="320"
        >
    </section>

    <p id="dashboard-status" role="status" aria-live="polite">
        Memuat statistik dari API...
    </p>

    <p id="dashboard-error" role="alert" hidden></p>

    <div id="dashboard-content" hidden>
        <section class="dash-section" aria-labelledby="wr-title">
            <div class="dash-section__header">
                <h2 id="wr-title" class="dash-section__title">
                    Top 5 Win Rate (WR)
                </h2>
                <a class="dash-section__link"
                   href="<?= htmlspecialchars($baseUrl . '/meta', ENT_QUOTES, 'UTF-8') ?>">
                    Lihat Semua <span aria-hidden="true">&rsaquo;</span>
                </a>
            </div>
            <div class="dash-panel">
                <ol class="dash-heroes" id="top-win-rate"></ol>
            </div>
        </section>

        <section class="dash-section" aria-labelledby="br-title">
            <div class="dash-section__header">
                <h2 id="br-title" class="dash-section__title">
                    Top 5 Ban Rate (BR)
                </h2>
                <a class="dash-section__link"
                   href="<?= htmlspecialchars($baseUrl . '/meta', ENT_QUOTES, 'UTF-8') ?>">
                    Lihat Semua <span aria-hidden="true">&rsaquo;</span>
                </a>
            </div>
            <div class="dash-panel">
                <ol class="dash-heroes" id="top-ban-rate"></ol>
            </div>
        </section>

        <section class="dash-section" aria-labelledby="pr-title">
            <div class="dash-section__header">
                <h2 id="pr-title" class="dash-section__title">
                    Top 5 Pick Rate (PR)
                </h2>
                <a class="dash-section__link"
                   href="<?= htmlspecialchars($baseUrl . '/meta', ENT_QUOTES, 'UTF-8') ?>">
                    Lihat Semua <span aria-hidden="true">&rsaquo;</span>
                </a>
            </div>
            <div class="dash-panel">
                <ol class="dash-heroes" id="top-pick-rate"></ol>
            </div>
        </section>

        <section class="dash-section" aria-labelledby="chart-title">
            <div class="dash-section__header">
                <h2 id="chart-title" class="dash-section__title">
                    Perbandingan WR dan BR
                </h2>
            </div>
            <div class="dash-panel dash-chart">
                <ul class="dash-legend">
                    <li>
                        <span class="dash-legend__box dash-legend__box--wr"></span>
                        Win Rate
                    </li>
                    <li>
                        <span class="dash-legend__box dash-legend__box--br"></span>
                        Ban Rate
                    </li>
                </ul>
                <div class="dash-chart__canvas">
                    <canvas
                        id="win-ban-chart"
                        role="img"
                        aria-label="Grafik perbandingan Win Rate dan Ban Rate hero"
                    >
                        Grafik perbandingan Win Rate dan Ban Rate hero.
                    </canvas>
                </div>
            </div>
        </section>

        <section class="dash-section" aria-labelledby="schedule-title">
            <div class="dash-section__header">
                <h2 id="schedule-title" class="dash-section__title">
                    Jadwal Pertandingan
                </h2>
                <a class="dash-section__link"
                   href="<?= htmlspecialchars($baseUrl . '/tournament', ENT_QUOTES, 'UTF-8') ?>">
                    Lihat Semua <span aria-hidden="true">&rsaquo;</span>
                </a>
            </div>
            <ul class="dash-panel dash-matches" id="match-schedule"></ul>
            <p id="schedule-status">
                Data jadwal pertandingan belum tersedia.
            </p>
        </section>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script src="<?= $assetBase ?>/js/api-client.js"></script>
<script src="<?= $assetBase ?>/js/pages/dashboard.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
