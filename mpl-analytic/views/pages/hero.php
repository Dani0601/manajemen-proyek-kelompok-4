<?php
$pageTitle = 'Daftar Hero | MLBB Guide';
$pageDescription = 'Jelajahi semua hero Mobile Legends beserta rolenya.';
$pageCss = 'hero.css';
$pageJs = 'hero.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$baseUrl = defined('BASE_URL') ? BASE_URL : '';
$roles = ['Fighter', 'Mage', 'Assassin', 'Tank', 'Marksman', 'Support'];
?>

<div class="hl" id="hero-list"
     data-detail-url="<?= htmlspecialchars($baseUrl . '/hero', ENT_QUOTES, 'UTF-8') ?>"
     data-asset-base="<?= htmlspecialchars($assetBase, ENT_QUOTES, 'UTF-8') ?>">
    <h1 class="hl__title">Jelajahi semua Hero</h1>

    <div class="hl__toolbar">
        <label class="hl__search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input type="search" id="hl-search" placeholder="Cari hero..." autocomplete="off" aria-label="Cari hero">
        </label>
        <select id="hl-role" class="hl__select" aria-label="Filter role">
            <option value="">All Roles</option>
            <?php foreach ($roles as $r): ?>
                <option value="<?= $r ?>"><?= $r ?></option>
            <?php endforeach; ?>
        </select>
    </div>

    <section class="hl__panel" aria-label="Daftar hero">
        <ul class="hl__grid" id="hl-grid"></ul>
        <p class="hl__state" id="hl-state" role="status">Memuat hero...</p>
    </section>
</div>
<script src="<?= $assetBase ?>/js/api-client.js"></script>
<script src="<?= $assetBase ?>/js/pages/hero.js"></script>
<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
