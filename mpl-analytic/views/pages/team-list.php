<?php
/**
 * Data Tim MPL ID.
 * Daftar tim + ringkasan statistik. Klik tim -> halaman daftar pemain (card berikutnya).
 * FE2: ID kontainer #tl-list jangan diganti.
 */
$pageTitle = 'Data Tim MPL ID | MLBB Guide';
$pageDescription = 'Daftar tim, statistik pertandingan, dan performa tiap tim di MPL Indonesia.';
$pageCss = 'team-list.css';
$pageJs = 'team-list.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$seasonId = max(1, (int) ($_GET['season'] ?? 1));
$seasonNumber = 18;
// Sementara, sampai halaman daftar pemain dibuat. {id} diganti team_id oleh JS.
$teamDetailUrl = '/player-list?team={id}';
?>

<div class="tl is-loading"
     data-asset-base="<?= $assetBase ?>"
     data-season-id="<?= $seasonId ?>"
     data-season-number="<?= $seasonNumber ?>"
     data-detail-url="<?= htmlspecialchars($teamDetailUrl, ENT_QUOTES, 'UTF-8') ?>">

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

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>