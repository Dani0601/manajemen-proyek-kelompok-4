<?php
/**
 * MPL / Tournament.
 * Sub-halaman dibuka dari sub-navigasi di menu (navbar): Jadwal | Klasemen | Hasil Pertandingan
 * lewat hash #jadwal | #klasemen | #hasil. Tanpa hash = Jadwal.
 * FE2: ID kontainer #tr-*-content jangan diganti.
 */
$pageTitle = 'MPL / Tournament | MLBB Guide';
$pageDescription = 'Jadwal, hasil pertandingan, dan klasemen MPL ID.';
$pageCss = 'tournament.css';
$pageJs = 'tournament.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
// Season: ID untuk API (seasons.season_id) & nomor tampilan sesuai Figma.
$seasonId = max(1, (int) ($_GET['season'] ?? 1));
$seasonNumber = 18;
$seasonLabel = 'MPL ID Season ' . $seasonNumber;
$teamDetailUrl = 'team-detail?id={id}';

$loading = static fn(string $label) =>
    '<div class="tr-skeleton" role="status" aria-live="polite">'
    . '<span class="visually-hidden">' . $label . '</span>'
    . str_repeat('<span class="tr-skeleton__row" aria-hidden="true"></span>', 4)
    . '</div>';
?>

<div class="tr is-loading" data-asset-base="<?= $assetBase ?>" data-view="jadwal" data-season-id="<?= $seasonId ?>" data-season-number="<?= $seasonNumber ?>">
    <header class="tr-head">
        <span class="tr-skel__bar tr-head-skel" style="width:60%"></span>
        <span class="tr-skel__bar tr-head-skel" style="width:100%; margin-top:0"></span>
        <span class="tr-skel__bar tr-head-skel tr-head-skel--jadwal" style="width:30%; margin-top:0"></span>
        <h1 class="tr-title" id="tr-head-title">Jadwal Pertandingan</h1>
        <p class="tr-note" id="tr-schedule-note"></p>
    </header>

    <!-- JADWAL -->
    <section class="tr-panel" id="tr-panel-jadwal" aria-label="Jadwal pertandingan">
        <h2 class="tr-section-title">Jadwal Pertandingan Musim ke-<span data-season-no><?= $seasonNumber ?></span></h2> 
        <div id="tr-week-nav" class="tr-wk">
            <div class="tr-skel-wk" aria-hidden="true">
                <span class="tr-skel__bar" style="width:50px"></span>
                <div class="tr-skel-wk__btns">
                    <?php for ($i = 0; $i < 9; $i++): ?><span class="tr-skel-wk__btn"></span><?php endfor; ?>
                </div>
            </div>
        </div>
        <div id="tr-schedule-content">
            <div class="tr-skel" role="status" aria-live="polite" aria-label="Memuat jadwal">
                <?php foreach ([2, 3, 4] as $rows): ?>
                <div class="tr-skel__day">
                    <span class="tr-skel__bar" style="width:90px"></span>
                    <?php for ($i = 0; $i < $rows; $i++): ?>
                    <div class="tr-skel__row"><span class="tr-skel__bar" style="width:36px"></span></div>
                    <?php endfor; ?>
                </div>
                <?php endforeach; ?>
                <div class="tr-skel__status">
                    <span class="tr-skel__spinner" aria-hidden="true"></span>
                    Memuat Halaman
                </div>
            </div>
        </div>
    </section>

    <!-- HASIL PERTANDINGAN -->
    <section class="tr-panel" id="tr-panel-hasil" aria-label="Hasil pertandingan" hidden>
        <h2 class="tr-section-title">Hasil Pertandingan Musim ke-<span data-season-no><?= $seasonNumber ?></span></h2>
        <div id="tr-results-content">
            <div class="tr-skel" role="status" aria-live="polite" aria-label="Memuat hasil pertandingan">
                <div class="tr-skel-wk" aria-hidden="true" style="border:1px solid var(--tr-navy);background:#fff">
                    <span class="tr-skel__bar" style="width:50px"></span>
                    <div class="tr-skel-wk__btns">
                        <?php for ($i = 0; $i < 9; $i++): ?><span class="tr-skel-wk__btn"></span><?php endfor; ?>
                    </div>
                </div>
                <?php foreach ([2, 3, 3] as $rows): ?>
                <div class="tr-skel__day">
                    <span class="tr-skel__bar" style="width:90px"></span>
                    <?php for ($i = 0; $i < $rows; $i++): ?>
                    <div class="tr-skel__row"><span class="tr-skel__bar" style="width:36px"></span></div>
                    <?php endfor; ?>
                </div>
                <?php endforeach; ?>
                <div class="tr-skel__status">
                    <span class="tr-skel__spinner" aria-hidden="true"></span>
                    Memuat Halaman
                </div>
            </div>
        </div>
    </section>

    <!-- KLASEMEN LENGKAP -->
    <section class="tr-panel" id="tr-panel-klasemen" aria-label="Klasemen" hidden>
        <div class="mb-4">
            <p id="tr-standings-leader" class="mt-0 mb-0" style="font-size: 14px; font-weight: 500; color: #000;"></p>
        </div>

        <!-- Tabel Klasemen Wrapper -->
        <div class="card bg-dark border-secondary shadow-sm mb-4">
            <div class="card-body p-0">
                <!-- Kontainer JS Tidak Diubah -->
                <div id="tr-standings-content">
                    <div class="tr-skel" role="status" aria-live="polite" aria-label="Memuat klasemen">
                        <div class="tr-skel__box tr-skel__box--table"></div>
                        <div class="tr-skel__box tr-skel__box--sm">
                            <span class="tr-skel__bar" style="width:120px"></span>
                        </div>
                        <div class="tr-skel__status">
                            <span class="tr-skel__spinner" aria-hidden="true"></span>
                            Memuat Halaman
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cara Membaca Tabel (Legend) -->
        <section class="tr-legend shadow-sm" aria-labelledby="tr-legend-title">
            <div class="tr-legend-header">
                <h3 id="tr-legend-title">Cara Membaca Tabel Klasemen</h3>
            </div>
            <dl>
                <dt>Poin</dt>
                <dd>Poin pertandingan</dd>
                
                <dt>M-K (WL)</dt>
                <dd>Kemenangan dan kekalahan pertandingan</dd>
                
                <dt>+/-</dt>
                <dd>Selisih skor bersih dalam pertandingan</dd>
                
                <dt>PTD</dt>
                <dd>Kemenangan dan kekalahan game dalam pertandingan</dd>
            </dl>
        </section>
    </section>
    <section class="tr-panel" id="tr-panel-tim" aria-label="Daftar Tim" hidden>
        <div class="tl is-loading"
            data-asset-base="<?= $assetBase ?>"
            data-season-id="<?= $seasonId ?>"
            data-season-number="<?= $seasonNumber ?>"
            data-detail-url="<?= htmlspecialchars($teamDetailUrl, ENT_QUOTES, 'UTF-8') ?>">

            <div id="tl-list">
                <div class="tl-grid" role="status" aria-live="polite" aria-label="Memuat daftar tim">
                    <?php for ($i = 0; $i < 6; $i++): ?>
                    <div class="tl-skel__card">
                        <div class="tl-skel__top"><span class="tl-skel__bar" style="width:120px"></span></div>
                        <div class="tl-skel__stats">
                            <span class="tl-skel__bar"></span><span class="tl-skel__bar"></span>
                            <span class="tl-skel__bar"></span><span class="tl-skel__bar"></span>
                        </div>
                    </div>
                    <?php endfor; ?>
                </div>
                <div class="tl-skel__status">
                    <span class="tl-skel__spinner" aria-hidden="true"></span> Memuat Halaman
                </div>
            </div>
        </div>

    </section>
</div>

<script src="<?= $assetBase ?>/js/api-client.js"></script>
<script src="<?= $assetBase ?>/js/pages/match-results.js"></script>
<script src="<?= $assetBase ?>/js/pages/tournament-schedule.js"></script>
<script src="<?= $assetBase ?>/js/pages/tournament-standings.js"></script>
<script src="<?= $assetBase ?>/js/pages/tournament-tabs.js"></script>
<script src="<?= $assetBase ?>/js/pages/team-list.js"></script>
<?php require BASE_PATH . '/views/layouts/footer.php'; ?>