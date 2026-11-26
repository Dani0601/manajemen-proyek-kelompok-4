<?php
$pageTitle = 'Daftar Transfer | MLBB Guide';
$pageDescription = 'Daftar transfer pemain MPL Indonesia Season 18.';
$pageCss = 'transfer.css';
$pageJs = 'transfer.js';

require BASE_PATH . '/views/layouts/header.php';
require BASE_PATH . '/views/layouts/navbar.php';
?>

<div id="transfer" class="tf" data-state="loading">
    <h1 class="tf-title">Daftar Transfer</h1>

    <div class="tf-filters">
        <label class="tf-search">
            <span class="visually-hidden">Cari pemain</span>
            <input id="tf-q" type="search" class="tf-search__input" placeholder="Cari pemain..." autocomplete="off">
        </label>

        <label class="tf-field">
            <span class="visually-hidden">Filter tim</span>
            <select id="tf-team" class="tf-select" disabled>
                <option value="">Semua Tim</option>
            </select>
        </label>

        <label class="tf-field">
            <span class="visually-hidden">Filter jenis transfer</span>
            <select id="tf-type" class="tf-select" disabled>
                <option value="">Semua Jenis</option>
            </select>
        </label>
    </div>

    <div id="tf-table-wrap" class="tf-panel" hidden>
        <table class="tf-table">
            <thead>
                <tr>
                    <th scope="col">Pemain</th>
                    <th scope="col">Tim Asal</th>
                    <th scope="col"><span class="visually-hidden">Arah</span></th>
                    <th scope="col">Tim Baru</th>
                    <th scope="col">Jenis Transfer</th>
                    <th scope="col">Tanggal</th>
                </tr>
            </thead>
            <tbody id="tf-body"></tbody>
        </table>
        <nav id="tf-pager" class="tf-pager" aria-label="Halaman transfer"></nav>
    </div>

    <div id="tf-skeleton" class="tf-panel tf-skel" hidden></div>

    <div id="tf-empty" class="tf-panel tf-empty" role="status" hidden>
        <span class="tf-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M7 18v-6M12 18V7M17 18v-9"/></svg>
        </span>
        <strong class="tf-empty__title">Belum ada data transfer</strong>
        <span class="tf-empty__text">Data daftar transfer belum tersedia.</span>
    </div>

    <div id="tf-error" class="tf-panel tf-empty" role="alert" hidden>
        <strong class="tf-empty__title">Gagal memuat data transfer</strong>
        <span class="tf-empty__text">Periksa koneksi internet Anda lalu coba lagi.</span>
        <button type="button" id="tf-retry" class="tf-btn">Coba Lagi</button>
    </div>

    <p id="tf-loading" class="tf-loading" role="status" aria-live="polite" hidden>
        <span class="tf-spinner" aria-hidden="true"></span><span>Memuat Halaman</span>
    </p>
</div>

<script src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/js/api-client.js?v=<?= (int) @filemtime(BASE_PATH . '/public/assets/js/api-client.js') ?>"></script>

<?php require BASE_PATH . '/views/layouts/footer.php'; ?>