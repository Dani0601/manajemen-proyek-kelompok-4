<?php
$pageTitle = 'Dashboard | MLBB Guide';
$pageDescription = 'Temukan hero terbaik, build item, dan strategi untuk menang di Mobile Legends: Bang Bang.';
$pageCss = 'home.css';
$pageJs = 'home.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');

// Kartu fitur: label mengikuti Figma, ikon dari public/assets/images/icons.
$features = [
    ['label' => 'Hero',       'path' => '/hero',              'icon' => 'Iron Age Warrior.png'],
    ['label' => 'Build',      'path' => '/meta',              'icon' => 'Footman.png'],
    ['label' => 'Tf pemain',  'path' => '/player-comparison', 'icon' => 'Trophy.png'],
    ['label' => 'MPL',        'path' => '/tournament',        'icon' => 'Trophy.png'],
];

// Data statis untuk pratinjau UI saja (belum terhubung ke API/statistik).
$previewHeroes = [
    ['name' => 'Hero 1', 'image' => 'lancelot.png'],
    ['name' => 'Hero 2', 'image' => 'fanny.png'],
    ['name' => 'Hero 3', 'image' => 'ling.png'],
    ['name' => 'Hero 4', 'image' => 'hayabusa.png'],
    ['name' => 'Hero 5', 'image' => 'selena.png'],
];
?>

<!-- BANNER SAMBUTAN -->
<section class="home-banner" aria-labelledby="home-banner-title">
    <img
        class="home-banner__image"
        src="<?= $assetBase ?>/images/banners/landing-banners.png"
        alt=""
        width="1063"
        height="440"
    >

    <div class="home-banner__content">
        <h1 id="home-banner-title" class="home-banner__title">
            Selamat datang<br>di MLBB Guide
        </h1>

        <p class="home-banner__description">
            Temukan hero terbaik, build item,<br>dan strategi untuk menang!
        </p>
    </div>
</section>

<!-- TOMBOL AKSI -->
<div class="home-actions">
    <a href="<?= htmlspecialchars($baseUrl . '/hero', ENT_QUOTES, 'UTF-8') ?>" class="home-btn">
        Mulai Menjelajah
    </a>

    <a href="<?= htmlspecialchars($baseUrl . '/meta', ENT_QUOTES, 'UTF-8') ?>" class="home-btn">
        Tier List Hero
    </a>
</div>

<!-- FITUR -->
<section class="home-section" aria-labelledby="home-features-title">
    <h2 id="home-features-title" class="home-section__title">Yang bisa kamu temukan</h2>

    <div class="home-features">
        <?php foreach ($features as $feature): ?>
            <a
                class="home-feature"
                href="<?= htmlspecialchars($baseUrl . $feature['path'], ENT_QUOTES, 'UTF-8') ?>"
            >
                <img
                    class="home-feature__icon"
                    src="<?= $assetBase ?>/images/icons/<?= rawurlencode($feature['icon']) ?>"
                    alt=""
                    width="40"
                    height="40"
                >
                <span class="home-feature__label">
                    <?= htmlspecialchars($feature['label'], ENT_QUOTES, 'UTF-8') ?>
                </span>
            </a>
        <?php endforeach; ?>
    </div>
</section>

<!-- CUPLIKAN HERO META + CTA -->
<section class="home-section" aria-labelledby="home-meta-title">
    <h2 id="home-meta-title" class="home-section__title">Cuplikan hero meta</h2>

    <div class="home-meta">
        <div class="home-meta__preview">
            <ul class="home-meta__list">
                <?php foreach ($previewHeroes as $hero): ?>
                    <?php require BASE_PATH . '/views/components/hero-card.php'; ?>
                <?php endforeach; ?>
            </ul>
        </div>

        <aside class="home-cta" aria-labelledby="home-cta-title">
            <h3 id="home-cta-title" class="home-cta__title">Siap naik rank?</h3>

            <a href="<?= htmlspecialchars($baseUrl . '/hero', ENT_QUOTES, 'UTF-8') ?>" class="home-btn home-btn--small">
                Mulai Menjelajah
            </a>
        </aside>
    </div>
</section>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>