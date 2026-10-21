<?php
/**
 * Komponen: thumbnail hero.
 *
 * Variabel yang diharapkan:
 *   $hero['name']  string  Nama/label hero.
 *   $hero['image'] string  Nama file di public/assets/images/heroes/.
 */
?>
<li class="hero-card">
    <img
        class="hero-card__image"
        src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/images/heroes/<?= rawurlencode($hero['image']) ?>"
        alt="<?= htmlspecialchars($hero['name'], ENT_QUOTES, 'UTF-8') ?>"
        width="84"
        height="84"
        loading="lazy"
    >
    <span class="hero-card__name"><?= htmlspecialchars($hero['name'], ENT_QUOTES, 'UTF-8') ?></span>
</li>
