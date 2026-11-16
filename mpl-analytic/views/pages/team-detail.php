<?php
$pageTitle = 'Detail Tim | MLBB Guide';
$pageDescription = 'Detail tim MPL Indonesia: ringkasan pertandingan, statistik game, dan roster pemain.';
$pageCss = 'team-detail.css';
$pageJs = 'team-detail.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$teamId = (int) ($_GET['id'] ?? 0);
$backUrl = htmlspecialchars($baseUrl . '/tournament#tim', ENT_QUOTES, 'UTF-8');

/*
 * KONTRAK UNTUK FE2:
 * - Sumber data: GET /api/teams/{id}/stats (ApiClient.getTeamStats)
 * - Banner per tim: {assetBase}/images/teams/banner/{team_id}.png (disediakan Fadli)
 * - Ikon ringkasan: {assetBase}/images/icons/{nama}.svg (diekspor FE 1 dari Detail_Tim.svg)
 * - ID elemen dipakai team-detail.js, jangan diubah tanpa mengubah JS
 */
?>

<div
    class="td"
    id="team-detail"
    data-asset-base="<?= $assetBase ?>"
    data-base-url="<?= htmlspecialchars($baseUrl, ENT_QUOTES, 'UTF-8') ?>"
    data-team-id="<?= $teamId ?>"
    data-state="loading"
>
    <header class="td-header">
        <a class="td-header__back" href="<?= $backUrl ?>" aria-label="Kembali ke daftar tim">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 12H4M10 6l-6 6 6 6"></path>
            </svg>
        </a>
        <h1 class="td-header__title">Detail Tim</h1>
    </header>

    <p id="td-message" class="td-message" role="status" aria-live="polite">Memuat data tim...</p>

    <div id="td-content" class="td-content" hidden>
        <!-- Banner: gambar dari Fadli. Jika belum ada, tampil kotak gelap berisi logo dan nama -->
        <section class="td-banner" aria-label="Identitas tim">
            <img id="td-banner-img" class="td-banner__img" alt="" hidden>
            <div id="td-banner-fallback" class="td-banner__fallback">
                <img id="td-logo" class="td-banner__logo" alt="" hidden>
                <h2 id="td-name" class="td-banner__name"></h2>
            </div>
        </section>

        <section class="td-section" aria-labelledby="td-summary-title">
            <h3 id="td-summary-title" class="td-section__title">Ringkasan Pertandingan</h3>
            <div id="td-summary" class="td-cards"></div>
        </section>

        <section class="td-section" aria-labelledby="td-game-title">
            <h3 id="td-game-title" class="td-section__title">Statistik Game</h3>
            <ul id="td-game-stats" class="td-list"></ul>
        </section>

        <section class="td-section" aria-labelledby="td-roster-title">
            <h3 id="td-roster-title" class="td-section__title">Roster</h3>
            <ul id="td-roster" class="td-roster"></ul>
        </section>
    </div>
</div>

<script src="<?= $assetBase ?>/js/api-client.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>