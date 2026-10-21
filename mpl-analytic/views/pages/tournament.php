<?php
$pageTitle = 'MPL / Tournament | MLBB Guide';
$pageDescription = 'Jadwal, hasil, dan klasemen MPL ID.';
$pageCss = 'tournament.css';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';

$assetBase = htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8');
$baseUrl = rtrim(
    str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')),
    '/'
);

// Data dummy untuk pratinjau UI (mengikuti Figma). FE2 dapat menggantinya
// dengan data API; pertahankan bentuk array agar tampilan ikut berubah.
$seasonTitle = 'MPL ID Season 14';

$matches = [
    ['team1' => 'Bigetron Alpha', 'image1' => 'bigetron.png',  'score' => '2-0', 'team2' => 'Aura Fire',      'image2' => 'aura-fire.png'],
    ['team1' => 'Onic Esports',   'image1' => 'onic.png',      'score' => '2-1', 'team2' => 'RRQ Hoshi',      'image2' => 'rrq.png'],
    ['team1' => 'Evos Glory',     'image1' => 'evos.png',      'score' => '1-2', 'team2' => 'Geek Fam',       'image2' => 'geek-fam.png'],
    ['team1' => 'RRQ Hoshi',      'image1' => 'rrq.png',       'score' => '2-1', 'team2' => 'Aura Fire',      'image2' => 'aura-fire.png'],
    ['team1' => 'Geek Fam',       'image1' => 'geek-fam.png',  'score' => '0-2', 'team2' => 'Bigetron Alpha', 'image2' => 'bigetron.png'],
];

$standings = [
    ['team' => 'Bigetron Alpha', 'image' => 'bigetron.png', 'played' => 16, 'wl' => '13-3', 'points' => 10],
    ['team' => 'Onic Esports',   'image' => 'onic.png',     'played' => 16, 'wl' => '12-4', 'points' => 9],
    ['team' => 'RRQ Hoshi',      'image' => 'rrq.png',      'played' => 16, 'wl' => '10-6', 'points' => 9],
    ['team' => 'Evos Glory',     'image' => 'evos.png',     'played' => 16, 'wl' => '8-8',  'points' => 6],
];

$e = static fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
?>

<div class="tournament-page">

    <h1 class="visually-hidden"><?= $e($seasonTitle) ?></h1>

    <!-- BANNER: desktop hanya gambar; teks hanya tampil di mobile (sesuai Figma) -->
    <section class="tournament-hero" aria-label="Banner turnamen">
        <img
            src="<?= $assetBase ?>/images/banners/dashboard-banner.png"
            alt=""
            width="1084"
            height="320"
        >
        <div class="tournament-hero__content">
            <p class="tournament-hero__title"><?= $e($seasonTitle) ?></p>
            <p class="tournament-hero__text">Jadwal, hasil dan klasemen</p>
        </div>
    </section>

    <!-- TAB: tampilan statis, semua putih, tidak berpindah halaman -->
    <div class="tournament-tabs">
        <button type="button" class="tournament-tab">Jadwal</button>
        <button type="button" class="tournament-tab">Hasil Pertandingan</button>
        <button type="button" class="tournament-tab">Klasemen</button>
    </div>

    <!-- KARTU HASIL PERTANDINGAN -->
    <section class="tournament-panel" aria-label="Hasil pertandingan">
        <ul class="match-list">
            <?php foreach ($matches as $match): ?>
                <li class="match-card">
                    <div class="match-team match-team-left">
                        <img class="team-logo" src="<?= $assetBase ?>/images/teams/<?= rawurlencode($match['image1']) ?>" alt="" loading="lazy">
                        <span class="team-name"><?= $e($match['team1']) ?></span>
                    </div>

                    <span class="match-score"><?= $e($match['score']) ?></span>

                    <div class="match-team match-team-right">
                        <span class="team-name"><?= $e($match['team2']) ?></span>
                        <img class="team-logo" src="<?= $assetBase ?>/images/teams/<?= rawurlencode($match['image2']) ?>" alt="" loading="lazy">
                    </div>
                </li>
            <?php endforeach; ?>
        </ul>
    </section>

    <!-- KLASEMEN -->
    <section class="standings-section" aria-labelledby="standings-title">
        <div class="standings-heading">
            <h2 id="standings-title"><?= 'Klasemen ' . $e($seasonTitle) ?></h2>
            <a class="standings-link" href="<?= $e($baseUrl . '/tournament') ?>">
                Lihat Semua <span aria-hidden="true">&rsaquo;</span>
            </a>
        </div>

        <div class="standings-table-wrapper">
            <table class="standings-table">
                <thead>
                    <tr>
                        <th scope="col">Tim</th>
                        <th scope="col">M</th>
                        <th scope="col">W-L</th>
                        <th scope="col">Poin</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($standings as $row): ?>
                        <tr>
                            <td class="standings-team">
                                <img class="team-logo" src="<?= $assetBase ?>/images/teams/<?= rawurlencode($row['image']) ?>" alt="" loading="lazy">
                                <span><?= $e($row['team']) ?></span>
                            </td>
                            <td><?= $e($row['played']) ?></td>
                            <td><?= $e($row['wl']) ?></td>
                            <td><?= $e($row['points']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </section>
</div>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>
