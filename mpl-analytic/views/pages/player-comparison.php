<?php
$pageTitle = 'Perbandingan Pemain | MLBB Guide';
$pageDescription = 'Bandingkan statistik dan performa dua pemain MPL ID.';
$pageCss = 'comparison.css';
$pageJs = 'comparison.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');

// Pemilih per sisi: tim + pemain. Opsinya diisi comparison.js.
// Sisi A (kiri, biru): tim lalu pemain. Sisi B (kanan, oranye): dicerminkan lewat CSS.
$sides = [
    'a' => ['label' => 'pertama', 'placeholder' => 'Pemain A'],
    'b' => ['label' => 'kedua', 'placeholder' => 'Pemain B'],
];

$chevron = '<svg class="pc-select__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none"'
    . ' stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"'
    . ' aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"></path></svg>';

// Kerangka heksagon untuk skeleton radar: enam sumbu, sudut searah jarum jam
// dari atas, sama dengan startAngle 330 pada Chart.js di comparison.js.
$radarCenter = 80;
$radarRadius = 68;
$radarAngles = [330, 30, 90, 150, 210, 270];

$radarPoint = static function (int $angle, float $scale) use ($radarCenter, $radarRadius): array {
    $rad = deg2rad($angle);

    return [
        round($radarCenter + $radarRadius * $scale * sin($rad), 1),
        round($radarCenter - $radarRadius * $scale * cos($rad), 1),
    ];
};

$radarRing = static function (float $scale) use ($radarAngles, $radarPoint): string {
    $points = [];

    foreach ($radarAngles as $angle) {
        $points[] = implode(',', $radarPoint($angle, $scale));
    }

    return implode(' ', $points);
};

// Posisi label skeleton di sekeliling radar (nama sumbu + nilai).
$radarLabels = ['tl', 'tr', 'r', 'br', 'bl', 'l'];
?>

<div
    class="pc"
    data-asset-base="<?= $assetBase ?>"
>

    <!-- Judul halaman (tampil di mobile; di desktop hanya untuk pembaca layar) -->
    <header class="pc-header">
        <h1 class="pc-header__title">Perbandingan Pemain</h1>
    </header>

    <!-- PEMILIH + KARTU PEMAIN -->
    <section id="pc-lineup" class="pc-lineup" aria-label="Pilih pemain yang dibandingkan">

        <div class="pc-pickers">
            <?php foreach ($sides as $key => $side): ?>
                <div class="pc-picker pc-picker--<?= $key ?>">

                    <div class="pc-select pc-select--team">
                        <label class="visually-hidden" for="pc-team-<?= $key ?>">
                            Tim pemain <?= $side['label'] ?>
                        </label>

                        <img class="pc-select__logo" alt="" width="18" height="18" hidden>

                        <select id="pc-team-<?= $key ?>" class="pc-select__control" data-side="<?= $key ?>">
                            <option value="">Pilih tim</option>
                        </select>

                        <?= $chevron ?>
                    </div>

                    <div class="pc-select pc-select--player">
                        <label class="visually-hidden" for="pc-player-<?= $key ?>">
                            Pemain <?= $side['label'] ?>
                        </label>

                        <span class="pc-select__dot" aria-hidden="true"></span>

                        <select id="pc-player-<?= $key ?>" class="pc-select__control" data-side="<?= $key ?>">
                            <option value=""><?= htmlspecialchars($side['placeholder'], ENT_QUOTES, 'UTF-8') ?></option>
                        </select>

                        <?= $chevron ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <!-- Foto pemain + Vs. Saat loading kartu tampil kosong (kotak putih). -->
        <div id="pc-cards" class="pc-cards" hidden>
            <article id="pc-card-a" class="pc-card"></article>
            <span class="pc-vs">Vs</span>
            <article id="pc-card-b" class="pc-card"></article>
        </div>
    </section>

    <!-- Pesan netral: pilih kedua pemain -->
    <p id="pc-status" class="pc-status" role="status" aria-live="polite" hidden></p>

    <!-- Pengumuman untuk pembaca layar (loading, hasil siap) -->
    <p id="pc-live" class="visually-hidden" role="status" aria-live="polite"></p>

    <!-- STATE VALIDASI: pemain yang sama dipilih di kedua pemilih -->
    <div id="pc-alert" class="pc-alert" role="alert" hidden>
        <div class="pc-alert__body">
            <svg class="pc-alert__icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="12" fill="currentColor"></circle>
                <path d="M12 6.5v6.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"></path>
                <circle cx="12" cy="17.2" r="1.4" fill="#fff"></circle>
            </svg>

            <div class="pc-alert__text">
                <p class="pc-alert__title">Pemain yang sama tidak dapat dipilih</p>
                <p class="pc-alert__hint">Silakan pilih pemain yang berbeda untuk A dan B</p>
            </div>
        </div>

        <button id="pc-alert-close" class="pc-alert__close" type="button" aria-label="Tutup pesan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.6" stroke-linecap="round" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6 6 18"></path>
            </svg>
        </button>
    </div>

    <!-- STATE DATA KOSONG / GALAT untuk seluruh perbandingan (diisi comparison.js) -->
    <div id="pc-notice" class="pc-notice pc-table" hidden></div>

    <!-- STATE LOADING: kerangka bagian bawah halaman -->
    <div id="pc-skeleton" class="pc-skeleton" aria-hidden="true" hidden>

        <section class="pc-section">
            <h2 class="pc-section__title"><span class="pc-sk pc-sk--heading"></span></h2>

            <div class="pc-panel pc-radar-skeleton">
                <svg class="pc-radar-skeleton__shape" viewBox="0 0 160 160" fill="none"
                     stroke="#B8B8B8" stroke-width="1" focusable="false">
                    <?php foreach ([0.25, 0.5, 0.75, 1] as $scale): ?>
                        <polygon points="<?= $radarRing($scale) ?>"></polygon>
                    <?php endforeach; ?>
                    <?php foreach ($radarAngles as $angle): ?>
                        <?php [$x, $y] = $radarPoint($angle, 1); ?>
                        <line x1="<?= $radarCenter ?>" y1="<?= $radarCenter ?>" x2="<?= $x ?>" y2="<?= $y ?>"></line>
                    <?php endforeach; ?>
                </svg>

                <?php foreach ($radarLabels as $position): ?>
                    <span class="pc-sk-label pc-sk-label--<?= $position ?>">
                        <span class="pc-sk pc-sk--pill"></span>
                        <span class="pc-sk pc-sk--pill pc-sk--pill-short"></span>
                    </span>
                <?php endforeach; ?>
            </div>
        </section>

        <?php foreach ([3, 3] as $rowCount): ?>
            <section class="pc-section">
                <h2 class="pc-section__title"><span class="pc-sk pc-sk--heading"></span></h2>
                <div class="pc-table">
                    <?php for ($row = 0; $row < $rowCount; $row++): ?>
                        <div class="pc-row">
                            <span class="pc-sk pc-sk--a"></span>
                            <span class="pc-sk pc-sk--label"></span>
                            <span class="pc-sk pc-sk--b"></span>
                        </div>
                    <?php endfor; ?>
                </div>
            </section>
        <?php endforeach; ?>

        <section class="pc-section">
            <h2 class="pc-section__title"><span class="pc-sk pc-sk--heading"></span></h2>
            <div class="pc-table pc-table--perf">
                <?php for ($row = 0; $row < 2; $row++): ?>
                    <div class="pc-row">
                        <span class="pc-sk pc-sk--name"></span>
                        <span class="pc-bar pc-bar--skeleton"><span class="pc-bar__fill"></span></span>
                        <span class="pc-sk pc-sk--value"></span>
                    </div>
                <?php endfor; ?>
            </div>
        </section>

        <p class="pc-loading">
            <svg class="pc-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="3" stroke-linecap="round" focusable="false">
                <circle cx="12" cy="12" r="9" opacity="0.25"></circle>
                <path d="M21 12a9 9 0 0 0-9-9"></path>
            </svg>
            <span>Memuat perbandingan</span>
        </p>
    </div>

    <!-- HASIL PERBANDINGAN -->
    <div id="pc-result" class="pc-result" hidden>

        <!-- RADAR -->
        <section class="pc-section" aria-labelledby="pc-radar-title">
            <h2 id="pc-radar-title" class="pc-section__title">Perbandingan Pemain</h2>

            <div class="pc-panel pc-radar">
                <ul class="pc-legend">
                    <li><span class="pc-legend__box pc-legend__box--a"></span><span id="pc-legend-a">Pemain A</span></li>
                    <li><span class="pc-legend__box pc-legend__box--b"></span><span id="pc-legend-b">Pemain B</span></li>
                </ul>

                <div class="pc-radar__canvas">
                    <canvas id="pc-radar-chart" role="img" aria-label="Grafik radar perbandingan dua pemain">
                        Grafik radar perbandingan dua pemain.
                    </canvas>
                </div>
            </div>
        </section>

        <!-- STATISTIK LIGA (bisa berisi state data kosong) -->
        <section class="pc-section" aria-labelledby="pc-league-title">
            <h2 id="pc-league-title" class="pc-section__title">Statistik Liga</h2>
            <div id="pc-league" class="pc-table"></div>
        </section>

        <!-- STATISTIK DETAIL (bisa berisi state data kosong) -->
        <section class="pc-section" aria-labelledby="pc-detail-title">
            <h2 id="pc-detail-title" class="pc-section__title">Statistik Detail</h2>
            <div id="pc-detail" class="pc-table"></div>
        </section>

        <!-- PERFORMA (WIN RATE) -->
        <section class="pc-section" aria-labelledby="pc-perf-title">
            <h2 id="pc-perf-title" class="pc-section__title">Performa (win rate)</h2>
            <div id="pc-perf" class="pc-table pc-table--perf"></div>
        </section>

        <p id="pc-note" class="pc-note" hidden>Data pada halaman ini masih berupa contoh untuk pratinjau tampilan.</p>
    </div>
</div>

<!-- Chart.js untuk radar (versi dipatok) -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
