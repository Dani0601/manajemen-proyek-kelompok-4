<?php
/**
 * MPL / Tournament.
 * Sub-halaman dibuka dari sub-navigasi di menu (navbar): Jadwal | Klasemen | Hasil Pertandingan
 * lewat hash #jadwal | #klasemen | #hasil. Tanpa hash = Jadwal.
 * FE2: ID kontainer #tr-*-content jangan diganti.
 */
$pageTitle = 'MPL / Tournament | MLBB Guide';
$pageDescription = 'Jadwal, hasil pertandingan, dan klasemen MPL ID.';
$pageCss = 'tournament.css';
$pageJs = 'tournament.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
// Season: ID untuk API (seasons.season_id) & nomor tampilan sesuai Figma.
$seasonId = max(1, (int) ($_GET['season'] ?? 1));
$seasonNumber = 18;
$seasonLabel = 'MPL ID Season ' . $seasonNumber;

$loading = static fn(string $label) =>
    '<div class="tr-skeleton" role="status" aria-live="polite">'
    . '<span class="visually-hidden">' . $label . '</span>'
    . str_repeat('<span class="tr-skeleton__row" aria-hidden="true"></span>', 4)
    . '</div>';
?>

<div class="tr" data-asset-base="<?= $assetBase ?>" data-view="jadwal" data-season-id="<?= $seasonId ?>" data-season-number="<?= $seasonNumber ?>">
    <!-- JUDUL HALAMAN -->
    <header class="tr-head">
        <h1 class="tr-title" id="tr-head-title">Jadwal MPL Indonesia Season <?= $seasonNumber ?></h1>
        <p class="tr-note" id="tr-schedule-note"></p>
    </header>

    <!-- JADWAL -->
    <section class="tr-panel" id="tr-panel-jadwal" aria-label="Jadwal pertandingan">
        <h2 class="tr-section-title">Jadwal Pertandingan Musim ke-<span data-season-no><?= $seasonNumber ?></span></h2>
        <div id="tr-schedule-content"></div>
    </section>

    <!-- HASIL PERTANDINGAN -->
    <section class="tr-panel" id="tr-panel-hasil" aria-label="Hasil pertandingan" hidden>
        <h2 class="tr-section-title">Hasil Pertandingan Musim ke-<span data-season-no><?= $seasonNumber ?></span></h2>
        <div id="tr-results-content"><?= $loading('Memuat hasil pertandingan...') ?></div>
    </section>

    <!-- KLASEMEN LENGKAP -->
    <section class="tr-panel" id="tr-panel-klasemen" aria-label="Klasemen" hidden>
        <h2 class="tr-section-title">Klasemen Musim ke-<span data-season-no><?= $seasonNumber ?></span></h2>
        <div id="tr-standings-content"></div>

        <section class="tr-legend" aria-labelledby="tr-legend-title" hidden>
            <h3 id="tr-legend-title">Cara membaca tabel</h3>
            <dl>
                <dt>Poin</dt><dd>Poin pertandingan</dd>
                <dt>WL</dt><dd>Kemenangan dan kekalahan pertandingan</dd>
                <dt>+/-</dt><dd>Selisih skor bersih dalam pertandingan</dd>
                <dt>Pertandingan</dt><dd>Kemenangan dan kekalahan game dalam pertandingan</dd>
            </dl>
        </section>
    </section>
</div>

<script src="<?= $assetBase ?>/js/api-client.js"></script>
<script src="<?= $assetBase ?>/js/pages/match-results.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>