<?php
$pageTitle = 'Detail Hero | MLBB Guide';
$pageDescription = 'Detail hero Mobile Legends: build item, emblem, battle spell, skill, statistik, dan hero counter.';
$pageCss = 'hero-detail.css';
$pageJs = 'hero-detail.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$heroId = (int) ($_GET['id'] ?? 0);

/*
 * KONTRAK UNTUK FE2 (Ali): lihat docs/hero-detail-kontrak.md
 * - Data diberikan ke HeroDetail.render(data) di hero-detail.js
 * - Id pada elemen di bawah ini TIDAK boleh diubah (dipakai JS)
 * - Alamat halaman: /hero-detail?id=<hero_id> (BUKAN /hero; /hero dicadangkan untuk daftar hero)
 * - Hero id dibaca dari ?id= dan tersedia di data-hero-id
 */
?>

<div
    class="hd"
    id="hero-detail"
    data-asset-base="<?= $assetBase ?>"
    data-hero-id="<?= $heroId ?>"
>
    <header class="hd-header">
        <a class="hd-header__back" href="<?= htmlspecialchars($baseUrl . '/dashboard', ENT_QUOTES, 'UTF-8') ?>" aria-label="Kembali ke dashboard">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 12H4M10 6l-6 6 6 6"></path>
            </svg>
        </a>
        <h1 class="hd-header__title">Detail Hero</h1>
    </header>

    <!-- BANNER -->
    <section class="hd-section" data-hd-section="banner" aria-label="Banner hero">
        <div class="hd-banner" data-hd-panel>
            <img id="hd-banner-img" class="hd-banner__image" alt="" width="1000" height="310">
            <span id="hd-hero-name" class="visually-hidden"></span>
            <div class="hd-state-slot" hidden></div>
        </div>
    </section>

    <!-- BUILD ITEM + EMBLEM + BATTLE SPELL -->
    <section class="hd-section hd-build" data-hd-section="build" aria-labelledby="hd-build-title">
        <div class="hd-build__layout" data-hd-panel>
            <div class="hd-build__items">
                <h2 id="hd-build-title" class="hd-section__title">Build item (6 slot)</h2>
                <div class="hd-card hd-card--shadow">
                    <ol id="hd-build-items" class="hd-items" aria-labelledby="hd-build-title"></ol>
                </div>
            </div>

            <div class="hd-build__side">
                <div id="hd-emblem" class="hd-card hd-setup hd-setup--emblem" aria-label="Emblem setup"></div>
                <div id="hd-spell" class="hd-card hd-setup hd-setup--spell" aria-label="Battle spell"></div>
            </div>

            <div class="hd-state-slot" hidden></div>
        </div>
    </section>

    <!-- SKILL HERO -->
    <section class="hd-section" data-hd-section="skills" aria-labelledby="hd-skills-title">
        <h2 id="hd-skills-title" class="hd-section__title">Skill Hero</h2>
        <div class="hd-card hd-card--line" data-hd-panel>
            <ul id="hd-skills" class="hd-skills"></ul>
            <div class="hd-state-slot" hidden></div>
        </div>
    </section>

    <!-- OFFICIAL RATINGS (hanya ada di desain mobile) -->
    <section class="hd-section hd-ratings-section" data-hd-section="ratings" aria-labelledby="hd-ratings-title">
        <h2 id="hd-ratings-title" class="hd-section__title">Official Ratings</h2>
        <div class="hd-card hd-card--line" data-hd-panel>
            <dl id="hd-ratings" class="hd-ratings"></dl>
            <div class="hd-state-slot" hidden></div>
        </div>
    </section>

    <!-- STATISTIK + HERO COUNTER -->
    <div class="hd-duo">
        <section class="hd-section" data-hd-section="stats" aria-labelledby="hd-stats-title">
            <h2 id="hd-stats-title" class="hd-section__title">Statistik Hero</h2>
            <div class="hd-card hd-card--line" data-hd-panel>
                <ul id="hd-stats" class="hd-stats"></ul>
                <div class="hd-state-slot" hidden></div>
            </div>
        </section>

        <section class="hd-section" data-hd-section="counters" aria-labelledby="hd-counter-title">
            <h2 id="hd-counter-title" class="hd-section__title">Hero Counter</h2>
            <div class="hd-counters" data-hd-panel>
                <div class="hd-counter hd-counter--favorable">
                    <p class="hd-pill">Hero yang menguntungkan</p>
                    <ul id="hd-counter-favorable" class="hd-counter__list"></ul>
                </div>
                <div class="hd-counter hd-counter--unfavorable">
                    <p class="hd-pill">Hero yang kurang menguntungkan</p>
                    <ul id="hd-counter-unfavorable" class="hd-counter__list"></ul>
                </div>
                <div class="hd-state-slot" hidden></div>
            </div>
        </section>
    </div>

    <!-- ATURAN ITEM SITUASIONAL -->
    <section class="hd-section" data-hd-section="note" aria-labelledby="hd-note-title">
        <h2 id="hd-note-title" class="hd-section__title">Aturan item situasional</h2>
        <div class="hd-card hd-card--line" data-hd-panel>
            <div class="hd-note">
                <svg class="hd-note__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5B800"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z"></path>
                </svg>
                <p id="hd-note" class="hd-note__text"></p>
            </div>
            <div class="hd-state-slot" hidden></div>
        </div>
    </section>

    <!-- Tampil jika halaman dibuka tanpa ?id= (mis. dari menu Hero) -->
    <section id="hd-no-hero" class="hd-empty" hidden aria-labelledby="hd-no-hero-title">
        <span class="hd-empty__icon" aria-hidden="true">
            <img src="<?= $assetBase ?>/images/icons/Bar%20Chart.png" alt="" width="24" height="24">
        </span>
        <h2 id="hd-no-hero-title" class="hd-empty__title">Hero belum dipilih</h2>
        <p class="hd-empty__text">Pilih salah satu hero dari Dashboard untuk melihat detail build, skill, dan statistiknya.</p>
        <a class="hd-empty__button" href="<?= htmlspecialchars($baseUrl . '/dashboard', ENT_QUOTES, 'UTF-8') ?>">Ke Dashboard</a>
    </section>

    <p class="hd-note-dummy" id="hd-dummy-note" hidden>Data pada halaman ini masih berupa contoh untuk pratinjau tampilan.</p>
    <p id="hd-page-loading" class="visually-hidden" role="status" aria-live="polite"></p>
</div>

<script src="<?= $assetBase ?>/js/api-client.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
