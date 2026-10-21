<?php
$pageTitle = 'Perbandingan Pemain | MLBB Guide';
$pageDescription = 'Bandingkan statistik dan performa dua pemain MPL ID.';
$pageCss = 'comparison.css';
$pageJs = 'comparison.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');

// Dua pemilih pemain memakai markup yang sama; opsinya diisi comparison.js.
$pickers = [
    ['key' => 'a', 'label' => 'Pemain pertama'],
    ['key' => 'b', 'label' => 'Pemain kedua'],
];
?>

<div
    class="pc"
    data-asset-base="<?= $assetBase ?>"
>

    <!-- Header halaman (tampil di mobile; di desktop judulnya hanya untuk pembaca layar) -->
    <header class="pc-header">
        <a
            class="pc-header__back"
            href="<?= htmlspecialchars($baseUrl . '/dashboard', ENT_QUOTES, 'UTF-8') ?>"
            aria-label="Kembali ke dashboard"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 12H4M10 6l-6 6 6 6"></path>
            </svg>
        </a>
        <h1 class="pc-header__title">Perbandingan Pemain</h1>
    </header>

    <!-- PILIH PEMAIN -->
    <section class="pc-picker" aria-label="Pilih pemain yang dibandingkan">
        <?php foreach ($pickers as $picker): ?>
            <div class="pc-select pc-select--<?= $picker['key'] ?>">
                <label class="visually-hidden" for="pc-player-<?= $picker['key'] ?>">
                    <?= htmlspecialchars($picker['label'], ENT_QUOTES, 'UTF-8') ?>
                </label>

                <span class="pc-select__dot" aria-hidden="true"></span>

                <select id="pc-player-<?= $picker['key'] ?>" class="pc-select__control">
                    <option value="">Pilih pemain</option>
                </select>

                <svg class="pc-select__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
                     stroke-linejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"></path>
                </svg>
            </div>
        <?php endforeach; ?>
    </section>

    <!-- Pesan status: validasi, memuat, kosong, galat -->
    <p id="pc-status" class="pc-status" role="status" aria-live="polite" hidden></p>

    <div id="pc-result" class="pc-result" hidden>

        <!-- KARTU PEMAIN + VS -->
        <section class="pc-cards" aria-label="Pemain yang dibandingkan">
            <article id="pc-card-a" class="pc-player"></article>
            <span class="pc-vs">Vs</span>
            <article id="pc-card-b" class="pc-player"></article>
        </section>

        <!-- RADAR -->
        <section class="pc-section" aria-labelledby="pc-radar-title">
            <h2 id="pc-radar-title" class="pc-section__title">Perbandingan Pemain</h2>

            <div class="pc-panel pc-radar">
                <ul class="pc-legend">
                    <li><span class="pc-legend__box pc-legend__box--a"></span><span id="pc-legend-a">Pemain 1</span></li>
                    <li><span class="pc-legend__box pc-legend__box--b"></span><span id="pc-legend-b">Pemain 2</span></li>
                </ul>

                <div class="pc-radar__canvas">
                    <canvas id="pc-radar-chart" role="img" aria-label="Grafik radar perbandingan dua pemain">
                        Grafik radar perbandingan dua pemain.
                    </canvas>
                </div>
            </div>
        </section>

        <!-- STATISTIK LIGA -->
        <section class="pc-section" aria-labelledby="pc-league-title">
            <h2 id="pc-league-title" class="pc-section__title">Statistik Liga</h2>
            <div id="pc-league" class="pc-table"></div>
        </section>

        <!-- STATISTIK DETAIL -->
        <section class="pc-section" aria-labelledby="pc-detail-title">
            <h2 id="pc-detail-title" class="pc-section__title">Statistik Detail</h2>
            <div id="pc-detail" class="pc-table"></div>
        </section>

        <!-- PERFORMA (WIN RATE) -->
        <section class="pc-section" aria-labelledby="pc-perf-title">
            <h2 id="pc-perf-title" class="pc-section__title">Performa (win rate)</h2>
            <div id="pc-perf" class="pc-table pc-table--perf"></div>
        </section>

        <p class="pc-note">Data pada halaman ini masih berupa contoh untuk pratinjau tampilan.</p>
    </div>
</div>

<!-- Chart.js untuk radar (versi dipatok) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
