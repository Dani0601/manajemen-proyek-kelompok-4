<?php
$pageTitle = 'Detail Player | MLBB Guide';
$pageDescription = 'Detail pemain MPL Indonesia: statistik utama, statistik performa, dan hero favorit.';
$pageCss = 'player-detail.css';
$pageJs = 'player-detail.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$playerId = (int) ($_GET['id'] ?? 0);
$baseUrlAttr = htmlspecialchars($baseUrl, ENT_QUOTES, 'UTF-8');
// Sementara ke daftar tim. JS mengganti ke team-detail?id={team_id} setelah data masuk.
$backUrl = htmlspecialchars($baseUrl . '/team-list', ENT_QUOTES, 'UTF-8');

/*
 * KONTRAK UNTUK FE2:
 * - Sumber data: GET /api/players/{id}/stats (ApiClient.getPlayerStats)
 * - Banner: {assetBase}/images/teams/banner/{team_id}.png (sama dengan team-detail)
 * - ID elemen dipakai player-detail.js, jangan diubah tanpa mengubah JS
 */
?>

<div
    class="pd"
    id="player-detail"
    data-asset-base="<?= $assetBase ?>"
    data-base-url="<?= $baseUrlAttr ?>"
    data-player-id="<?= $playerId ?>"
    data-state="loading"
>
    <header class="pd-header">
        <a id="pd-back" class="pd-header__back" href="<?= $backUrl ?>" aria-label="Kembali ke detail tim">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 12H4M10 6l-6 6 6 6"></path>
            </svg>
        </a>
        <h1 id="pd-title" class="pd-header__title">Player</h1>
    </header>

    <p id="pd-message" class="pd-message" role="status" aria-live="polite">Memuat data pemain...</p>
    <div id="pd-skeleton" class="pd-skel" role="status" aria-live="polite" aria-label="Memuat data pemain">
        <div class="pd-skel__banner"></div>

        <span class="pd-skel__bar" style="width:140px"></span>
        <div class="pd-skel__cards">
            <div class="pd-skel__box"></div>
            <div class="pd-skel__box"></div>
        </div>

        <span class="pd-skel__bar" style="width:160px"></span>
        <div class="pd-skel__list">
            <?php for ($i = 0; $i < 5; $i++): ?><div class="pd-skel__row"><span class="pd-skel__bar"></span></div><?php endfor; ?>
        </div>

        <span class="pd-skel__bar" style="width:120px"></span>
        <div class="pd-skel__list">
            <?php for ($i = 0; $i < 2; $i++): ?><div class="pd-skel__row"><span class="pd-skel__bar"></span></div><?php endfor; ?>
        </div>

        <div class="pd-skel__status">
            <span class="pd-skel__spinner" aria-hidden="true"></span> Memuat Halaman
        </div>
    </div>
    <div id="pd-content" class="pd-content" hidden>
        <section class="pd-banner" aria-label="Identitas pemain">
            <img id="pd-banner-img" class="pd-banner__img" alt="" hidden>

            <div id="pd-banner-fallback" class="pd-banner__fallback">
                <span class="pd-banner__divider" aria-hidden="true"></span>
                <img id="pd-team-logo" class="pd-banner__logo" alt="" hidden>
                <div class="pd-banner__text">
                    <h2 id="pd-team-name" class="pd-banner__team"></h2>
                    <p class="pd-banner__pill">
                        <span class="pd-banner__pill-a">MPL INDONESIA</span>
                        <span class="pd-banner__pill-b">SEASON 18</span>
                    </p>
                </div>
            </div>

            <img id="pd-photo" class="pd-banner__photo" alt="" hidden>
        </section>

        <section class="pd-section" aria-labelledby="pd-main-title">
            <h3 id="pd-main-title" class="pd-section__title">Statistik Utama</h3>
            <div id="pd-main" class="pd-cards"></div>
        </section>

        <section class="pd-section" aria-labelledby="pd-perf-title">
            <h3 id="pd-perf-title" class="pd-section__title">Statistik Performa</h3>
            <ul id="pd-perf" class="pd-list"></ul>
        </section>

        <section class="pd-section" aria-labelledby="pd-heroes-title">
            <h3 id="pd-heroes-title" class="pd-section__title">Hero Favorit</h3>
            <ul id="pd-heroes" class="pd-heroes"></ul>
        </section>
    </div>
</div>

<script src="<?= $assetBase ?>/js/api-client.js"></script>
<script src="<?= $assetBase ?>/js/pages/player-detail.js"></script>
<?php require BASE_PATH . '/views/layouts/footer.php'; ?>