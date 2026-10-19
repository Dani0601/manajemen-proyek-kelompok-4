<?php
$pageTitle = 'Dashboard Analitik | MLBB Guide';
$pageDescription = 'Statistik meta hero dan jadwal pertandingan MPL.';
$pageCss = 'dashboard.css';
// $pageJs = 'dashboard.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$baseUrl = rtrim(
    str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')),
    '/'
);

// Data dummy untuk pratinjau UI (mengikuti Figma), BUKAN statistik MPL resmi.
// Nanti Ali dapat menggantinya dengan data dari API. Pertahankan bentuk
// array ini ('name', 'image', 'value') agar tampilan dan grafik ikut berubah.
$topWinRate = [
    ['name' => 'Miya',    'image' => 'miya.png',    'value' => 62.4],
    ['name' => 'Fanny',    'image' => 'fanny.png',    'value' => 62.2],
    ['name' => 'Ling',     'image' => 'ling.png',     'value' => 58.7],
    ['name' => 'Beatrix',  'image' => 'beatrix.png',  'value' => 56.3],
    ['name' => 'Lancelot', 'image' => 'lancelot.png', 'value' => 54.8],
];

$topBanRate = [
    ['name' => 'Lancelot', 'image' => 'lancelot.png', 'value' => 78.2],
    ['name' => 'Fanny',    'image' => 'fanny.png',    'value' => 72.8],
    ['name' => 'Ling',     'image' => 'ling.png',     'value' => 68.9],
    ['name' => 'Hayabusa', 'image' => 'hayabusa.png', 'value' => 65.4],
    ['name' => 'Selena',   'image' => 'selena.png',   'value' => 61.7],
];

$topPickRate = [
    ['name' => 'Lancelot', 'image' => 'lancelot.png', 'value' => 28.4],
    ['name' => 'Fanny',    'image' => 'fanny.png',    'value' => 28.4],
    ['name' => 'Ling',     'image' => 'ling.png',     'value' => 28.4],
    ['name' => 'Hayabusa', 'image' => 'hayabusa.png', 'value' => 28.4],
    ['name' => 'Selena',   'image' => 'selena.png',   'value' => 28.4],
];

$schedule = [
    ['team1' => 'RRQ Hoshi',  'image1' => 'rrq.png',      'team2' => 'ONIC Esports',   'image2' => 'onic.png',     'time' => '14:00'],
    ['team1' => 'EVOS Glory', 'image1' => 'evos.png',     'team2' => 'Bigetron Alpha', 'image2' => 'bigetron.png', 'time' => '16:30'],
    ['team1' => 'Aura Fire',  'image1' => 'aura.png',     'team2' => 'Geek Fam',       'image2' => 'geek.png',     'time' => '19:00'],
];

// Panel Top 5 memakai satu struktur yang sama.
$heroPanels = [
    ['id' => 'wr', 'title' => 'Top 5 Overpowered (WR)', 'prefix' => 'WR', 'heroes' => $topWinRate],
    ['id' => 'br', 'title' => 'Top 5 Most Banned (BR)', 'prefix' => 'BR', 'heroes' => $topBanRate],
    ['id' => 'pr', 'title' => 'Top 5 Pick Rate (PR)',   'prefix' => 'PR', 'heroes' => $topPickRate],
];

// Inisial untuk avatar cadangan jika file gambar belum tersedia.
$initials = function (string $name): string {
    $words = preg_split('/\s+/', trim($name));
    $letters = count($words) > 1
        ? mb_substr($words[0], 0, 1) . mb_substr($words[1], 0, 1)
        : mb_substr($words[0], 0, 2);

    return mb_strtoupper($letters);
};

// Data grafik berasal dari daftar WR dan BR di atas, sehingga selalu konsisten.
$valueByName = function (array $rows, string $name) {
    foreach ($rows as $row) {
        if ($row['name'] === $name) {
            return $row['value'];
        }
    }

    return null;
};

$chartLabels = array_values(array_unique(array_merge(
    array_column($topWinRate, 'name'),
    array_column($topBanRate, 'name')
)));

$chartData = [
    'labels' => $chartLabels,
    'wr' => array_map(function ($name) use ($topWinRate, $valueByName) {
        return $valueByName($topWinRate, $name);
    }, $chartLabels),
    'br' => array_map(function ($name) use ($topBanRate, $valueByName) {
        return $valueByName($topBanRate, $name);
    }, $chartLabels),
];
?>

<div class="dash">

    <h1 class="visually-hidden">Dashboard Analitik</h1>

    <!-- BANNER: hanya gambar, tanpa teks atau overlay seperti di Figma -->
    <section class="dash-banner" aria-label="Banner dashboard">
        <img
            class="dash-banner__image"
            src="<?= $assetBase ?>/images/banners/dashboard-banner.png"
            alt=""
            width="1084"
            height="320"
        >
    </section>

    <!-- TOP 5 WR, BR, PR -->
    <?php foreach ($heroPanels as $panel): ?>
        <section class="dash-section" aria-labelledby="<?= $panel['id'] ?>-title">
            <div class="dash-section__header">
                <h2 id="<?= $panel['id'] ?>-title" class="dash-section__title">
                    <?= htmlspecialchars($panel['title'], ENT_QUOTES, 'UTF-8') ?>
                </h2>
                <a class="dash-section__link" href="<?= htmlspecialchars($baseUrl . '/meta', ENT_QUOTES, 'UTF-8') ?>">
                    Lihat Semua <span aria-hidden="true">&rsaquo;</span>
                </a>
            </div>

            <div class="dash-panel">
                <ol class="dash-heroes" aria-labelledby="<?= $panel['id'] ?>-title">
                    <?php foreach ($panel['heroes'] as $index => $hero): ?>
                        <li class="dash-hero">
                            <div class="dash-hero__media">
                                <span class="dash-hero__rank"><?= $index + 1 ?></span>
                                <img
                                    class="dash-hero__image"
                                    src="<?= $assetBase ?>/images/heroes/<?= rawurlencode($hero['image']) ?>"
                                    alt="<?= htmlspecialchars($hero['name'], ENT_QUOTES, 'UTF-8') ?>"
                                    data-fallback="<?= htmlspecialchars(mb_strtoupper(mb_substr($hero['name'], 0, 1)), ENT_QUOTES, 'UTF-8') ?>"
                                    loading="lazy"
                                >
                            </div>
                            <span class="dash-hero__name">
                                <?= htmlspecialchars($hero['name'], ENT_QUOTES, 'UTF-8') ?>
                            </span>
                            <span class="dash-hero__stat">
                                <?= $panel['prefix'] ?> <?= number_format($hero['value'], 1) ?>%
                            </span>
                        </li>
                    <?php endforeach; ?>
                </ol>
            </div>
        </section>
    <?php endforeach; ?>

    <!-- GRAFIK WR vs BR (Chart.js, data dari PHP di atas) -->
    <section class="dash-section" aria-labelledby="chart-title">
        <div class="dash-section__header">
            <h2 id="chart-title" class="dash-section__title">Perbandingan WR dan BR</h2>
            <a class="dash-section__link" href="<?= htmlspecialchars($baseUrl . '/meta', ENT_QUOTES, 'UTF-8') ?>">
                Lihat detail <span aria-hidden="true">&rsaquo;</span>
            </a>
        </div>

        <div class="dash-panel dash-chart">
            <ul class="dash-legend">
                <li><span class="dash-legend__box dash-legend__box--wr"></span>Overpowered (WR)</li>
                <li><span class="dash-legend__box dash-legend__box--br"></span>Most Banned (BR)</li>
            </ul>

            <div
                class="dash-chart__canvas"
                data-chart="<?= htmlspecialchars(json_encode($chartData), ENT_QUOTES, 'UTF-8') ?>"
            >
                <canvas
                    id="win-ban-chart"
                    role="img"
                    aria-label="Grafik perbandingan Win Rate dan Ban Rate hero"
                >
                    Grafik perbandingan Win Rate dan Ban Rate.
                </canvas>
            </div>
        </div>

        <p class="dash-note">
            Data pada halaman ini masih berupa contoh untuk pratinjau tampilan.
        </p>
    </section>

    <!-- JADWAL PERTANDINGAN -->
    <section class="dash-section" aria-labelledby="schedule-title">
        <div class="dash-section__header">
            <h2 id="schedule-title" class="dash-section__title">Jadwal Pertandingan</h2>
            <a class="dash-section__link" href="<?= htmlspecialchars($baseUrl . '/tournament', ENT_QUOTES, 'UTF-8') ?>">
                Lihat Semua <span aria-hidden="true">&rsaquo;</span>
            </a>
        </div>

        <ul class="dash-panel dash-matches" aria-labelledby="schedule-title">
            <?php foreach ($schedule as $match): ?>
                <li class="dash-match">
                    <div class="dash-team dash-team--home">
                        <img
                            class="dash-team__logo"
                            src="<?= $assetBase ?>/images/teams/<?= rawurlencode($match['image1']) ?>"
                            alt=""
                            data-fallback="<?= htmlspecialchars($initials($match['team1']), ENT_QUOTES, 'UTF-8') ?>"
                            loading="lazy"
                        >
                        <span class="dash-team__name"><?= htmlspecialchars($match['team1'], ENT_QUOTES, 'UTF-8') ?></span>
                    </div>

                    <div class="dash-match__info">
                        <span class="dash-match__vs">Vs</span>
                        <span class="dash-match__time"><?= htmlspecialchars(str_replace(':', ' : ', $match['time']), ENT_QUOTES, 'UTF-8') ?></span>
                    </div>

                    <div class="dash-team dash-team--away">
                        <img
                            class="dash-team__logo"
                            src="<?= $assetBase ?>/images/teams/<?= rawurlencode($match['image2']) ?>"
                            alt=""
                            data-fallback="<?= htmlspecialchars($initials($match['team2']), ENT_QUOTES, 'UTF-8') ?>"
                            loading="lazy"
                        >
                        <span class="dash-team__name"><?= htmlspecialchars($match['team2'], ENT_QUOTES, 'UTF-8') ?></span>
                    </div>
                </li>
            <?php endforeach; ?>
        </ul>
    </section>
</div>

<!-- Chart.js untuk grafik, bukan gambar statis (versi dipatok) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<!-- <script src="/manajemen-proyek-kelompok-4/mpl-analytic/public/assets/js/api-client.js"></script> -->
<script src="/manajemen-proyek-kelompok-4/mpl-analytic/public/assets/js/pages/dashboard.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
