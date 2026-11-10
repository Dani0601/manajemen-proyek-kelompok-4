<?php
/**
 * MPL / Tournament.
 * Sub-halaman dibuka dari sub-navigasi di menu (navbar): Jadwal | Klasemen | Hasil Pertandingan
 * lewat hash #jadwal | #klasemen | #hasil. Tanpa hash = Jadwal.
 * FE2: ID kontainer #tr-*-content jangan diganti.
 */
$pageTitle = 'MPL / Tournament | MLBB Guide';
$pageDescription = 'Jadwal, hasil pertandingan, dan klasemen MPL ID.';
$pageCss = 'team-list.css';
$pageJs = 'team-list.js';

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
<div class="tl is-loading"
     data-season-id="<?= $seasonId ?>"
     data-season-number="<?= $seasonNumber ?>"
     data-detail-url="<?= $teamDetailUrl ?? '#' ?>/{id}">

    <header class="tl-head">
        <span class="tl-skel__bar tl-head-skel" style="width:40%"></span>
        <span class="tl-skel__bar tl-head-skel" style="width:70%"></span>
        <h1 class="tl-title">Data Tim MPL ID</h1>
        <p class="tl-note">
            Daftar tim, statistik pertandingan, dan performa tiap tim di MPL Indonesia Season <?= $seasonNumber ?>.
        </p>
    </header>

    <div id="tl-list">
        <div class="tl-grid" role="status" aria-live="polite" aria-label="Memuat daftar tim">
            <?php for ($i = 0; $i < 6; $i++): ?>
            <div class="tl-skel__card">
                <div class="tl-skel__top"><span class="tl-skel__bar" style="width:120px"></span></div>
                <div class="tl-skel__stats">
                    <span class="tl-skel__bar"></span><span class="tl-skel__bar"></span>
                    <span class="tl-skel__bar"></span><span class="tl-skel__bar"></span>
                </div>
            </div>
            <?php endfor; ?>
        </div>
        <div class="tl-skel__status">
            <span class="tl-skel__spinner" aria-hidden="true"></span> Memuat Halaman
        </div>
    </div>
</div>