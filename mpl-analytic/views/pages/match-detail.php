<?php
$pageTitle = 'Detail Pertandingan | MLBB Guide';
$pageDescription = 'Detail hasil pertandingan MPL Indonesia: skor, statistik, dan hero tiap game.';
$pageCss = 'match-detail.css';
$pageJs = 'match-detail.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$baseUrlAttr = htmlspecialchars($baseUrl, ENT_QUOTES, 'UTF-8');
$matchId = preg_replace('/[^A-Za-z0-9_\-]/', '', (string) ($_GET['id'] ?? ''));

/*
 * KONTRAK UNTUK FE1:
 * - Data: ApiClient.getMatchDetail(id) -> MatchMapper.normalize() (lihat match-mapper.js)
 * - Pergantian game: MatchDetailPage.setActiveGame(index), tanpa request baru
 * - FE1 mengisi render() di match-detail.js dan markup di #md-content
 */
?>

<div class="md" id="match-detail"
     data-asset-base="<?= $assetBase ?>"
     data-base-url="<?= $baseUrlAttr ?>"
     data-match-id="<?= htmlspecialchars($matchId, ENT_QUOTES, 'UTF-8') ?>"
     data-state="loading">

    <header class="md-header">
        <a id="md-back" class="md-header__back" href="<?= $baseUrlAttr ?>/tournament#tim" aria-label="Kembali">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 12H4M10 6l-6 6 6 6"></path>
            </svg>
        </a>
        <h1 class="md-header__title">Detail Hasil Match</h1>
    </header>

    <p id="md-message" class="md-message" role="status" aria-live="polite" hidden></p>

    <div id="md-skeleton" class="md-skel" role="status" aria-live="polite" aria-label="Memuat pertandingan">
        <div class="md-skel__banner"></div>
        <span class="md-skel__bar" style="width:180px;align-self:center"></span>
        <div class="md-skel__btns"><span></span><span></span><span></span></div>
        <div class="md-skel__btns md-skel__btns--2"><span></span><span></span></div>
        <div class="md-skel__block"></div>
        <div class="md-skel__status"><span class="md-skel__spinner" aria-hidden="true"></span> Memuat Halaman</div>
    </div>

    <div id="md-content" class="md-content" hidden>
        <section class="md-hero" aria-label="Skor pertandingan">
            <div class="md-hero__team">
                <img id="md-logo1" class="md-hero__logo" alt="" hidden>
                <span id="md-code1" class="md-hero__code"></span>
            </div>
            <div id="md-score" class="md-hero__score">- : -</div>
            <div class="md-hero__team">
                <img id="md-logo2" class="md-hero__logo" alt="" hidden>
                <span id="md-code2" class="md-hero__code"></span>
            </div>
        </section>

        <p id="md-when" class="md-when"></p>

        <div id="md-games" class="md-games" role="group" aria-label="Pilih game"></div>

        <div class="md-tabs" role="tablist" aria-label="Tampilan detail">
            <button type="button" id="md-tab-stats" class="md-tab is-active" role="tab" aria-selected="true" data-tab="stats">Statistik</button>
            <button type="button" id="md-tab-hero" class="md-tab" role="tab" aria-selected="false" data-tab="hero">Hero</button>
        </div>

        <section id="md-panel-stats" class="md-panel" role="tabpanel" aria-labelledby="md-tab-stats"></section>
        <section id="md-panel-hero" class="md-panel" role="tabpanel" aria-labelledby="md-tab-hero" hidden></section>
    </div>
</div>

<template id="md-cards-tpl">
    <div class="md-s__cards">
        <div class="md-s__card">
            <img class="md-s__icon" src="<?= $assetBase ?>/images/icons/match/kill.svg" alt="" aria-hidden="true">
            <span class="md-s__text">
                <span class="md-s__label">Total Kill</span>
                <strong class="md-s__value" data-key="kill"></strong>
            </span>
        </div>
        <div class="md-s__card">
            <img class="md-s__icon" src="<?= $assetBase ?>/images/icons/match/gold.svg" alt="" aria-hidden="true">
            <span class="md-s__text">
                <span class="md-s__label">Total Gold</span>
                <strong class="md-s__value" data-key="gold"></strong>
            </span>
        </div>
        <div class="md-s__card">
            <img class="md-s__icon" src="<?= $assetBase ?>/images/icons/match/damage.svg" alt="" aria-hidden="true">
            <span class="md-s__text">
                <span class="md-s__label">Total Damage</span>
                <strong class="md-s__value" data-key="damage"></strong>
            </span>
        </div>
        <div class="md-s__card">
            <img class="md-s__icon" src="<?= $assetBase ?>/images/icons/match/taken.svg" alt="" aria-hidden="true">
            <span class="md-s__text">
                <span class="md-s__label">Damage Taken</span>
                <strong class="md-s__value" data-key="taken"></strong>
            </span>
        </div>
    </div>
</template>

<script src="<?= $assetBase ?>/js/pages/team-assets.js"></script>
<script src="<?= $assetBase ?>/js/api-client.js"></script>
<script src="<?= $assetBase ?>/js/match-mapper.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>