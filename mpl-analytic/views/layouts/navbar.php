<?php
$baseUrl = defined('BASE_URL') ? BASE_URL : rtrim(
    str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')),
    '/'
);

if ($baseUrl === '.') {
    $baseUrl = '';
}

$currentPath = parse_url(
    $_SERVER['REQUEST_URI'] ?? '/',
    PHP_URL_PATH
) ?: '/';

if ($baseUrl !== '' && str_starts_with($currentPath, $baseUrl)) {
    $currentPath = substr($currentPath, strlen($baseUrl));
} else {
    $fallbackBases = [
        '/manajemen-proyek-kelompok-4/mpl-analytic/public',
        '/manajemen-proyek-kelompok-4',
        '/mpl-analytic/public',
    ];

    foreach ($fallbackBases as $fb) {
        if (str_starts_with($currentPath, $fb)) {
            $currentPath = substr($currentPath, strlen($fb));
            break;
        }
    }
}

$currentPath = '/' . trim($currentPath, '/');

// Halaman awal (/) adalah Dashboard
if ($currentPath === '/') {
    $currentPath = '/dashboard';
}

// Daftar navigasi utama
$navItems = [
    [
        'label' => 'Dashboard',
        'path' => '/dashboard',
        'icon' => 'Exterior.png',
    ],
    [
        'label' => 'Hero',
        'path' => '/hero',
        'icon' => 'Iron Age Warrior.png',
    ],
    [
        'label' => 'MPL / Tournament',
        'path' => '/tournament',
        'icon' => 'Trophy.png',
        // Sub-navigasi: dibuka lewat hash, dibaca oleh tournament.js
        'children' => [
            ['label' => 'Jadwal', 'key' => 'jadwal', 'path' => '/tournament#jadwal'],
            ['label' => 'Klasemen', 'key' => 'klasemen', 'path' => '/tournament#klasemen'],
            ['label' => 'Hasil Pertandingan', 'key' => 'hasil', 'path' => '/tournament#hasil'],
            ['label' => 'Daftar Tim', 'key' => 'tim', 'path' => '/tournament#tim'],
        ],
    ],
    [
        'label' => 'Perbandingan Pemain',
        'path' => '/player-comparison',
        'icon' => 'Footman.png',
    ],
    [
        'label' => 'Match Analitik',
        'path' => '/meta',
        'icon' => 'Bar Chart.png',
    ],
];

// Render daftar menu (dipakai sidebar desktop & menu mobile).
// $prefix = 'app-sidebar' | 'app-mobile-menu'
$renderNavItems = static function (array $items, string $currentPath, string $baseUrl, string $prefix): void {
    $e = static fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

    foreach ($items as $item) {
        $isActive = $currentPath === $item['path'];
        $href = $baseUrl . ($item['path'] === '/' ? '/' : $item['path']);
        $icon = '<span class="app-sidebar__icon"><img src="' . $e(ASSET_BASE) . '/images/icons/'
            . rawurlencode($item['icon']) . '" alt=""></span>';

        if (empty($item['children'])) {
            echo '<a href="' . $e($href) . '" class="' . $prefix . '__link' . ($isActive ? ' is-active' : '') . '"'
                . ($isActive ? ' aria-current="page"' : '') . '>' . $icon
                . '<span>' . $e($item['label']) . '</span></a>';
            continue;
        }

        // Menu dengan sub-navigasi (collapse). Terbuka otomatis di halamannya.
        $groupId = 'subnav-' . $prefix;
        echo '<div class="app-nav-group">';
        echo '<button type="button" class="' . $prefix . '__link app-nav-toggle' . ($isActive ? ' is-active' : '') . '"'
            . ' data-bs-toggle="collapse" data-bs-target="#' . $groupId . '"'
            . ' aria-expanded="' . ($isActive ? 'true' : 'false') . '" aria-controls="' . $groupId . '">'
            . $icon . '<span>' . $e($item['label']) . '</span>'
            . '<svg class="app-nav-toggle__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
            . ' stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>'
            . '</button>';
        echo '<div class="collapse' . ($isActive ? ' show' : '') . '" id="' . $groupId . '">'
            . '<div class="app-subnav" role="group" aria-label="Sub-navigasi ' . $e($item['label']) . '">';
        foreach ($item['children'] as $child) {
            echo '<a href="' . $e($baseUrl . $child['path']) . '" class="app-subnav__link" data-subnav="' . $e($child['key']) . '">'
                . $e($child['label']) . '</a>';
        }
        echo '</div></div></div>';
    }
};

// Search tidak ditampilkan pada halaman Detail Hero
// Halaman juga bisa menyembunyikannya lewat $hideGlobalSearch = true sebelum require navbar.
$isHeroDetailPage = $currentPath === '/hero-detail';
$showSearch = !$isHeroDetailPage && empty($hideGlobalSearch);
?>

<div class="app d-flex">

    <!-- Sidebar desktop -->
    <aside
        id="sidebar"
        class="app-sidebar d-none d-md-flex flex-column"
    >
        <a
            href="<?= htmlspecialchars($baseUrl . '/dashboard', ENT_QUOTES, 'UTF-8') ?>"
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

        <nav
            class="app-sidebar__nav"
            aria-label="Navigasi utama"
        >
            <?php $renderNavItems($navItems, $currentPath, $baseUrl, 'app-sidebar'); ?>
        </nav>
    </aside>

    <!-- Area utama -->
    <div class="app__main flex-grow-1">

        <!-- Topbar -->
        <header id="topbar" class="app-topbar<?= $showSearch ? '' : ' app-topbar--no-search' ?>">

            <!-- Logo mobile -->
            <a
                href="<?= htmlspecialchars($baseUrl . '/dashboard', ENT_QUOTES, 'UTF-8') ?>"
                class="app-topbar__brand d-md-none"
                aria-label="MLBB Guide - Dashboard"
            >
                <img
                    src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/images/brand/logo.png"
                    alt=""
                >
            </a>



            <!-- Tombol menu mobile -->
            <button
                class="app-topbar__menu d-md-none"
                type="button"
                data-bs-toggle="offcanvas"
                data-bs-target="#mobile-menu"
                aria-controls="mobile-menu"
                aria-label="Buka menu navigasi"
            >
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    aria-hidden="true"
                >
                    <path d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
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

                <h2
                    class="offcanvas-title"
                    id="mobile-menu-title"
                >
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

                <nav
                    class="app-mobile-menu__nav"
                    aria-label="Navigasi mobile"
                >
                    <?php $renderNavItems($navItems, $currentPath, $baseUrl, 'app-mobile-menu'); ?>
                </nav>

            </div>
        </div>

        <!-- Konten halaman dimulai setelah navbar -->
        <main id="page-content" class="app-content">