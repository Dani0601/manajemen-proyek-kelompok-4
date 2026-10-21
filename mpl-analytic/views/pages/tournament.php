
<?php
$pageTitle = 'MPL / Tournament | MLBB Guide';
$pageDescription = 'Jadwal, hasil pertandingan, dan klasemen MPL ID.';
$pageCss = 'tournament.css';
$pageJs = 'tournament.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');

$e = static fn($v) => htmlspecialchars(
    (string) $v,
    ENT_QUOTES,
    'UTF-8'
);

/* ------------------------------------------------------------------
 * DATA TURNAMEN
 *
 * Mock data pertandingan, jadwal, dan klasemen telah dihapus.
 * Data akan dimuat melalui tournament.js dari API.
 * ---------------------------------------------------------------- */

$tournament = [
    'title'    => 'MPL / Tournament',
    'subtitle' => 'Jadwal, hasil dan klasemen',
    'image'    => 'banners/banner.png',
];

// Data akan diisi oleh JavaScript dari API.
$results = [];
$schedule = [];
$standings = [];

/* ------------------------------------------------------------------
 * HELPER TAMPILAN
 * Struktur dan class CSS dari FE 1 dipertahankan.
 * Logo akan ditentukan di tournament.js menggunakan URL.
 * ---------------------------------------------------------------- */

// Fallback logo berupa inisial jika URL logo tidak tersedia.
$logo = static function (string $team) use ($e): string {
    $initial = $e(strtoupper(substr($team, 0, 2)));

    return '<span class="tr-logo tr-logo--fallback" aria-hidden="true">'
        . $initial
        . '</span>';
};

// Kartu pertandingan.
$matchCard = function (
    array $m,
    string $center,
    string $aria,
    string $winner = ''
) use ($logo, $e): string {
    $cls = static fn($side) => $winner === $side
        ? ' is-winner'
        : '';

    return '<a class="tr-match" href="#match-'
        . (int) ($m['id'] ?? 0)
        . '" data-match-id="'
        . (int) ($m['id'] ?? 0)
        . '" aria-label="'
        . $e($aria)
        . '">'
        . '<span class="tr-team tr-team--left'
        . $cls('A')
        . '">'
        . $logo((string) ($m['teamA'] ?? 'Tim A'))
        . '<span class="tr-team__name">'
        . $e($m['teamA'] ?? 'Tim A')
        . '</span></span>'
        . '<span class="tr-pill" aria-hidden="true">'
        . $center
        . '</span>'
        . '<span class="tr-team tr-team--right'
        . $cls('B')
        . '"><span class="tr-team__name">'
        . $e($m['teamB'] ?? 'Tim B')
        . '</span>'
        . $logo((string) ($m['teamB'] ?? 'Tim B'))
        . '</span></a>';
};

// Tabel klasemen.
$standingsTable = function (
    array $rows,
    string $caption
) use ($e): string {
    $html = '<div class="tr-table-wrap"><table class="tr-table">'
        . '<caption class="visually-hidden">'
        . $e($caption)
        . '</caption><thead><tr>'
        . '<th scope="col" class="tr-table__team">Tim</th>'
        . '<th scope="col">M</th>'
        . '<th scope="col">W-L</th>'
        . '<th scope="col" class="tr-table__pts">Poin</th>'
        . '</tr></thead><tbody>';

    foreach ($rows as $r) {
        $team = (string) ($r['team'] ?? 'Tim');

        $initial = $e(strtoupper(substr($team, 0, 2)));

        $logo = '<span class="tr-logo tr-logo--fallback" '
            . 'aria-hidden="true">'
            . $initial
            . '</span>';

        $html .= '<tr><th scope="row" class="tr-table__team">'
            . '<span class="tr-table__teamwrap">'
            . $logo
            . '<span>'
            . $e($team)
            . '</span></span></th>'
            . '<td>'
            . (int) ($r['played'] ?? 0)
            . '</td><td>'
            . (int) ($r['win'] ?? 0)
            . '-'
            . (int) ($r['lose'] ?? 0)
            . '</td><td class="tr-table__pts">'
            . (int) ($r['points'] ?? 0)
            . '</td></tr>';
    }

    return $html . '</tbody></table></div>';
};

// Pesan saat data belum tersedia.
$emptyState = static fn(string $desc) =>
    '<div class="tr-empty" role="status">'
    . '<strong>Data belum tersedia</strong>'
    . '<p>'
    . htmlspecialchars($desc, ENT_QUOTES, 'UTF-8')
    . '</p></div>';

$tabs = [
    'jadwal'   => 'Jadwal',
    'hasil'    => 'Hasil Pertandingan',
    'klasemen' => 'Klasemen',
];

$activeTab = 'hasil';
?>

<div class="tr" data-asset-base="<?= $assetBase ?>">
    <h1 class="visually-hidden">
        <?= $e($tournament['title']) ?>
    </h1>

    <!-- BANNER -->
    <section class="tr-banner" aria-label="Banner turnamen">
        <img
            src="<?= $assetBase ?>/images/<?= $e($tournament['image']) ?>"
            alt=""
        >

        <div class="tr-banner__text">
            <p class="tr-banner__title">
                <?= $e($tournament['title']) ?>
            </p>

            <p class="tr-banner__sub">
                <?= $e($tournament['subtitle']) ?>
            </p>
        </div>
    </section>

    <!-- TAB -->
    <div
        class="tr-tabs"
        role="tablist"
        aria-label="Tampilan turnamen"
    >
        <?php foreach ($tabs as $key => $label): ?>
            <button
                type="button"
                role="tab"
                class="tr-tab<?= $key === $activeTab ? ' is-active' : '' ?>"
                id="tr-tab-<?= $key ?>"
                data-tab="<?= $key ?>"
                aria-controls="tr-panel-<?= $key ?>"
                aria-selected="<?= $key === $activeTab ? 'true' : 'false' ?>"
                tabindex="<?= $key === $activeTab ? '0' : '-1' ?>"
            ><?= $e($label) ?></button>
        <?php endforeach; ?>
    </div>

    <!-- PANEL: JADWAL -->
    <section
        class="tr-panel"
        id="tr-panel-jadwal"
        role="tabpanel"
        aria-labelledby="tr-tab-jadwal"
        <?= $activeTab === 'jadwal' ? '' : 'hidden' ?>
    >
        <div id="tr-schedule-content">
            <?= $emptyState('Memuat jadwal pertandingan...') ?>
        </div>
    </section>

    <!-- PANEL: HASIL PERTANDINGAN -->
    <section
        class="tr-panel"
        id="tr-panel-hasil"
        role="tabpanel"
        aria-labelledby="tr-tab-hasil"
        <?= $activeTab === 'hasil' ? '' : 'hidden' ?>
    >
        <div id="tr-results-content">
            <?= $emptyState('Memuat hasil pertandingan...') ?>
        </div>

        <!-- PREVIEW KLASEMEN -->
        <section
            class="tr-standings"
            aria-labelledby="tr-st-title"
        >
            <div class="tr-section-head">
                <h2 id="tr-st-title">
                    Klasemen <?= $e($tournament['title']) ?>
                </h2>

                <button
                    type="button"
                    class="tr-link"
                    data-goto-tab="klasemen"
                >
                    Lihat Semua
                    <span aria-hidden="true">&gt;</span>
                </button>
            </div>

            <div id="tr-standings-preview">
                <?= $emptyState('Memuat klasemen...') ?>
            </div>
        </section>
    </section>

    <!-- PANEL: KLASEMEN LENGKAP -->
    <section
        class="tr-panel"
        id="tr-panel-klasemen"
        role="tabpanel"
        aria-labelledby="tr-tab-klasemen"
        <?= $activeTab === 'klasemen' ? '' : 'hidden' ?>
    >
        <div class="tr-section-head">
            <h2>
                Klasemen <?= $e($tournament['title']) ?>
            </h2>
        </div>

        <div id="tr-standings-content">
            <?= $emptyState('Memuat klasemen...') ?>
        </div>
    </section>
</div>

<script src="<?= $assetBase ?>/js/api-client.js"></script>
<script src="<?= $assetBase ?>/js/pages/match-results.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
