<?php
$baseUrl = rtrim(
    str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')),
    '/'
);

if ($baseUrl === '.') {
    $baseUrl = '';
}

$currentPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

$basePath = '/manajemen-proyek-kelompok-4/mpl-analytic/public';

if (str_starts_with($currentPath, $basePath)) {
    $currentPath = substr($currentPath, strlen($basePath));
}

$currentPath = '/' . trim($currentPath, '/');

$navItems = [
    ['label' => 'Dashboard', 'path' => '/dashboard', 'icon' => 'Exterior.png'],
    ['label' => 'Hero', 'path' => '/hero', 'icon' => 'Iron Age Warrior.png'],
    ['label' => 'MPL / Tournament', 'path' => '/tournament', 'icon' => 'Trophy.png'],
    ['label' => 'Perbandingan Pemain', 'path' => '/player-comparison', 'icon' => 'Footman.png'],
    ['label' => 'Match Analitik', 'path' => '/meta', 'icon' => 'Bar Chart.png'],
];
?>

<div class="app d-flex">
    <!-- Sidebar desktop -->
    <aside id="sidebar" class="app-sidebar d-none d-md-flex flex-column">
        <a
            href="<?= htmlspecialchars($baseUrl . '/', ENT_QUOTES, 'UTF-8') ?>"
            class="app-sidebar__brand"
            aria-label="MLBB Guide - Dashboard"
        >
            <img
                src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/images/brand/logo.png"
                alt=""
                class="app-sidebar__logo"
            >
            <span>MLBB GUIDE</span>
        </a>

        <nav class="app-sidebar__nav" aria-label="Navigasi utama">
            <?php foreach ($navItems as $item): ?>
                <?php
                $isActive = $currentPath === $item['path'];
                $href = $baseUrl . ($item['path'] === '/' ? '/' : $item['path']);
                ?>

                <a
                    href="<?= htmlspecialchars($href, ENT_QUOTES, 'UTF-8') ?>"
                    class="app-sidebar__link<?= $isActive ? ' is-active' : '' ?>"
                    <?= $isActive ? 'aria-current="page"' : '' ?>
                >
                    <span class="app-sidebar__icon">
                        <img
                            src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/images/icons/<?= rawurlencode($item['icon']) ?>"
                            alt=""
                        >
                    </span>
                    <span><?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?></span>
                </a>
            <?php endforeach; ?>
        </nav>
    </aside>

    <!-- Area utama -->
    <div class="app__main flex-grow-1">
        <!-- Topbar -->
        <header id="topbar" class="app-topbar">
            <a
                href="<?= htmlspecialchars($baseUrl . '/', ENT_QUOTES, 'UTF-8') ?>"
                class="app-topbar__brand d-md-none"
                aria-label="MLBB Guide - Dashboard"
            >
                <img
                    src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/images/brand/logo.png"
                    alt=""
                >
            </a>

            <form
                class="app-search"
                role="search"
                action="<?= htmlspecialchars($baseUrl . '/hero', ENT_QUOTES, 'UTF-8') ?>"
                method="get"
            >
                <button type="submit" aria-label="Cari">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.4"
                         stroke-linecap="round" aria-hidden="true">
                        <circle cx="10.5" cy="10.5" r="6.5"></circle>
                        <path d="M15.5 15.5 21 21"></path>
                    </svg>
                </button>

                <label class="visually-hidden" for="global-search">
                    Cari hero
                </label>

                <input
                    id="global-search"
                    type="search"
                    name="q"
                    placeholder="Cari hero..."
                    autocomplete="off"
                >
            </form>

            <button
                class="app-topbar__menu d-md-none"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#mobile-menu"
                aria-controls="mobile-menu"
                aria-label="Buka menu navigasi"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
        </header>

        <!-- Menu mobile -->
        <div
            class="offcanvas offcanvas-end app-mobile-menu d-md-none"
            tabindex="-1"
            id="mobile-menu"
            aria-labelledby="mobile-menu-title"
        >
            <div class="offcanvas-header">
                <h2 class="offcanvas-title" id="mobile-menu-title">
                    Menu Navigasi
                </h2>

                <button
                    type="button"
                    class="btn-close btn-close-white"
                    data-bs-dismiss="offcanvas"
                    aria-label="Tutup menu"
                ></button>
            </div>

            <div class="offcanvas-body">
                <nav class="app-mobile-menu__nav" aria-label="Navigasi mobile">
                    <?php foreach ($navItems as $item): ?>
                        <?php
                        $isActive = $currentPath === $item['path'];
                        $href = $baseUrl . ($item['path'] === '/' ? '/' : $item['path']);
                        ?>

                        <a
                            href="<?= htmlspecialchars($href, ENT_QUOTES, 'UTF-8') ?>"
                            class="app-mobile-menu__link<?= $isActive ? ' is-active' : '' ?>"
                            <?= $isActive ? 'aria-current="page"' : '' ?>
                            data-bs-dismiss="offcanvas"
                        >
                            <span class="app-sidebar__icon">
                                <img
                                    src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/images/icons/<?= rawurlencode($item['icon']) ?>"
                                    alt=""
                                >
                            </span>
                            <span><?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?></span>
                        </a>
                    <?php endforeach; ?>
                </nav>
            </div>
        </div>

        <!-- Konten halaman dimulai setelah navbar -->
        <main id="page-content" class="app-content">