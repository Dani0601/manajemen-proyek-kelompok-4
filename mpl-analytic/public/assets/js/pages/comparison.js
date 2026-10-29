/**
 * Halaman Perbandingan Pemain.
 *
 * Alur: getPlayerOptions() -> isi dropdown tim + pemain -> getPlayerComparison(idA, idB)
 *       -> render foto pemain, radar, statistik, dan win rate.
 *
 * Hanya DUA fungsi di bagian "SUMBER DATA" yang perlu diganti FE2 saat API
 * siap. Semua kode di bawahnya hanya membaca bentuk data yang sama dan tidak
 * mengetahui dari mana data berasal.
 *
 * State yang ditangani halaman ini:
 *   loading     skeleton (pemilih awal, kartu kosong, radar, tabel) + "Memuat perbandingan"
 *   kosong      per section: Statistik Liga / Statistik Detail (league / detail bernilai null)
 *               seluruh halaman: getPlayerComparison menolak dengan error.kind = 'empty'
 *   galat       getPlayerComparison / getPlayerOptions menolak (error lain) + tombol "Coba Lagi"
 *   validasi    pemain yang sama dipilih di A dan B -> pesan merah, hasil terakhir dipertahankan
 *
 * Pratinjau state untuk QA desain (tanpa mengubah data), hapus bila tidak diperlukan:
 *   /player-comparison?state=loading      loading tanpa akhir
 *   /player-comparison?state=empty        Statistik Liga kosong
 *   /player-comparison?state=nodata       seluruh perbandingan kosong
 *   /player-comparison?state=error        galat memuat + Coba Lagi
 *   /player-comparison?state=validation   pemain sama di A dan B
 */
(function () {
    'use strict';

    var root = document.querySelector('.pc');

    if (!root) {
        return;
    }

    var ASSET_BASE = root.getAttribute('data-asset-base') || '';

    // Warna diambil dari token CSS (.pc di comparison.css) agar satu sumber.
    var rootStyles = window.getComputedStyle(root);

    function token(name, fallback) {
        var value = rootStyles.getPropertyValue(name).trim();

        return value || fallback;
    }

    var COLOR_A = token('--pc-blue', '#2F6FED');
    var COLOR_B = token('--pc-orange', '#F28C28');
    // Huruf oranye memakai varian lebih gelap agar kontrasnya >= 4.5:1.
    var TEXT_A = token('--pc-blue-text', COLOR_A);
    var TEXT_B = token('--pc-orange-text', '#B85C00');

    // Urutan sumbu mengikuti Figma (searah jarum jam dari kiri atas).
    var AXES = [
        { key: 'killPower', label: 'Kill Power' },
        { key: 'farmRate', label: 'Farm Rate' },
        { key: 'objective', label: 'Objective' },
        { key: 'survival', label: 'Survival' },
        { key: 'teamfight', label: 'Teamfight' },
        { key: 'versatility', label: 'Versatility' }
    ];

    var formatInt = function (value) { return String(Math.round(value)); };
    var formatThousands = function (value) { return Number(value).toLocaleString('en-US'); };
    var formatDecimal = function (value) { return Number(value).toFixed(1); };
    var formatPercentInt = function (value) { return Math.round(value) + ' %'; };
    var formatPercentDecimal = function (value) { return Number(value).toFixed(1) + ' %'; };

    // Tabel perbandingan. Bila p[key] kosong (null/undefined) pada salah satu
    // pemain, section tampil sebagai "Data belum tersedia".
    var LEAGUE_TABLE = {
        key: 'league',
        emptyText: 'Statistik liga belum tersedia untuk pilihan pemain ini',
        rows: [
            { label: 'Match dimainkan', get: function (p) { return p.league.matches; }, format: formatInt },
            { label: 'KDA rata-rata', get: function (p) { return p.league.kdaAverage; }, format: formatDecimal },
            { label: 'Kill Participation', get: function (p) { return p.league.killParticipation; }, format: formatPercentInt }
        ]
    };

    var DETAIL_TABLE = {
        key: 'detail',
        emptyText: 'Statistik detail belum tersedia untuk pilihan pemain ini',
        rows: [
            { label: 'Gold per menit', get: function (p) { return p.detail.goldPerMinute; }, format: formatInt },
            { label: 'Damage per menit', get: function (p) { return p.detail.damagePerMinute; }, format: formatThousands },
            { label: 'Objective dikuasai', get: function (p) { return p.detail.objectiveControl; }, format: formatInt }
        ]
    };

    /* ==================================================================
     * SUMBER DATA (DUMMY)
     * Data contoh untuk pratinjau UI, BUKAN statistik MPL resmi.
     * Ganti dua fungsi di bawah dengan fetch ke API (FE2); jangan ubah kode
     * di luar blok ini. Set USING_DUMMY = false agar catatan "data contoh"
     * di halaman ikut hilang.
     *
     * getPlayerOptions()  -> Promise<Array<Opsi>>   semua pemain + tim-nya
     *   Opsi = { id, name, teamId, team, teamLogo, role }
     *   teamId/team dipakai untuk dropdown tim. Bila tidak ada pemain yang
     *   punya teamId, dropdown tim disembunyikan dan dropdown pemain memuat
     *   semua pemain.
     *
     * getPlayerComparison(idA, idB) -> Promise<{ a: Pemain, b: Pemain }>
     *   Pemain = { id, name, team, teamLogo, role, photo,
     *     radar:  { killPower, farmRate, objective, survival, teamfight, versatility },  // 0-100
     *     league: { matches, kdaAverage, killParticipation } | null,
     *     detail: { goldPerMinute, damagePerMinute, objectiveControl } | null,
     *     winRate }                                                                        // 0-100
     *   teamLogo / photo: nama file (images/teams/, images/players/) ATAU URL penuh.
     *   Kosong -> kartu menampilkan inisial + nama.
     *
     * Penolakan promise:
     *   Error dengan  error.kind = 'empty'  -> "Data belum tersedia" satu halaman
     *                                          (mis. respons 404 data pemain)
     *   Error lain                          -> "Data gagal dimuat" + Coba Lagi
     * ================================================================== */
    var USING_DUMMY = true;
    var DUMMY_DELAY_MS = 700;

    var DUMMY_PLAYERS = [
        {
            id: 101, name: 'Kairi', teamId: 4, team: 'ONIC Esports', teamLogo: 'onic.png',
            role: 'Jungler', photo: 'kairi.png',
            radar: { killPower: 84.2, farmRate: 62.7, objective: 55.0, survival: 58.5, teamfight: 82.0, versatility: 71.3 },
            league: { matches: 48, kdaAverage: 5.2, killParticipation: 74 },
            detail: { goldPerMinute: 812, damagePerMinute: 1240, objectiveControl: 31 },
            winRate: 68.7
        },
        {
            id: 102, name: 'Albertt', teamId: 2, team: 'Evos Glory', teamLogo: 'evos.png',
            role: 'Jungler', photo: 'albertt.png',
            radar: { killPower: 66.4, farmRate: 51.9, objective: 49.5, survival: 63.8, teamfight: 74.6, versatility: 58.2 },
            league: { matches: 45, kdaAverage: 4.8, killParticipation: 71 },
            detail: { goldPerMinute: 790, damagePerMinute: 1130, objectiveControl: 34 },
            winRate: 64.2
        },
        {
            id: 103, name: 'Lutfi', teamId: 2, team: 'Evos Glory', teamLogo: 'evos.png',
            role: 'Gold Laner', photo: '',
            radar: { killPower: 72.0, farmRate: 80.4, objective: 40.2, survival: 55.1, teamfight: 61.7, versatility: 66.0 },
            league: { matches: 40, kdaAverage: 4.1, killParticipation: 66 },
            detail: { goldPerMinute: 905, damagePerMinute: 1310, objectiveControl: 18 },
            winRate: 58.3
        },
        {
            id: 104, name: 'Sanz', teamId: 4, team: 'ONIC Esports', teamLogo: 'onic.png',
            role: 'EXP Laner', photo: '',
            radar: { killPower: 77.5, farmRate: 59.0, objective: 61.4, survival: 48.9, teamfight: 69.2, versatility: 52.8 },
            league: { matches: 36, kdaAverage: 3.9, killParticipation: 69 },
            detail: { goldPerMinute: 760, damagePerMinute: 1180, objectiveControl: 26 },
            winRate: 55.0
        },
        {
            id: 105, name: 'Kiboy', teamId: 4, team: 'ONIC Esports', teamLogo: 'onic.png',
            role: 'Roamer', photo: '',
            radar: { killPower: 48.3, farmRate: 40.1, objective: 70.2, survival: 72.5, teamfight: 78.9, versatility: 64.4 },
            league: { matches: 44, kdaAverage: 3.6, killParticipation: 78 },
            detail: { goldPerMinute: 610, damagePerMinute: 820, objectiveControl: 29 },
            winRate: 61.4
        },
        {
            id: 106, name: 'Pemain C', teamId: 1, team: 'RRQ Hoshi', teamLogo: 'rrq.png',
            role: 'Mid Laner', photo: '',
            radar: { killPower: 69.8, farmRate: 70.2, objective: 52.6, survival: 60.3, teamfight: 66.4, versatility: 74.1 },
            league: { matches: 38, kdaAverage: 4.4, killParticipation: 68 },
            detail: { goldPerMinute: 842, damagePerMinute: 1275, objectiveControl: 22 },
            winRate: 57.9
        },
        {
            // Contoh pemain tanpa statistik liga/detail, untuk melihat state "Data belum tersedia".
            id: 107, name: 'Pemain D', teamId: 3, team: 'Aura Fire', teamLogo: 'aura-fire.png',
            role: 'Gold Laner', photo: '',
            radar: { killPower: 58.0, farmRate: 66.5, objective: 45.9, survival: 52.2, teamfight: 63.0, versatility: 49.7 },
            league: null,
            detail: null,
            winRate: 51.2
        }
    ];

    function delay(value) {
        return new Promise(function (resolve) {
            window.setTimeout(function () { resolve(value); }, DUMMY_DELAY_MS);
        });
    }

    function getPlayerOptions() {
        return delay(DUMMY_PLAYERS.map(function (player) {
            return {
                id: player.id, name: player.name, teamId: player.teamId,
                team: player.team, teamLogo: player.teamLogo, role: player.role
            };
        }));
    }

    function getPlayerComparison(idA, idB) {
        var find = function (id) {
            return DUMMY_PLAYERS.filter(function (player) { return player.id === id; })[0];
        };
        var a = find(idA);
        var b = find(idB);

        if (!a || !b) {
            var missing = new Error('Pemain tidak ditemukan');
            missing.kind = 'empty';

            return Promise.reject(missing);
        }

        return delay({ a: a, b: b });
    }

    /* ==================================================================
     * Pratinjau state (QA desain). Membungkus getPlayerComparison dari luar,
     * jadi tetap berfungsi setelah FE2 mengganti sumber data.
     * ================================================================== */
    var PREVIEW = (function () {
        try {
            return new URLSearchParams(window.location.search).get('state');
        } catch (error) {
            return null;
        }
    }());

    function fetchComparison(idA, idB) {
        if (PREVIEW === 'loading') {
            return new Promise(function () {});
        }

        if (PREVIEW === 'error') {
            return delay(null).then(function () { throw new Error('Pratinjau galat'); });
        }

        if (PREVIEW === 'nodata') {
            return delay(null).then(function () {
                var none = new Error('Pratinjau data kosong');
                none.kind = 'empty';
                throw none;
            });
        }

        return getPlayerComparison(idA, idB).then(function (data) {
            if (PREVIEW === 'empty') {
                data = { a: Object.assign({}, data.a, { league: null }), b: Object.assign({}, data.b, { league: null }) };
            }

            return data;
        });
    }

    /* ==================================================================
     * Helper DOM
     * ================================================================== */
    function byId(id) {
        return document.getElementById(id);
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);

        if (className) {
            node.className = className;
        }
        if (text !== undefined) {
            node.textContent = text;
        }

        return node;
    }

    function initials(name) {
        var words = String(name).trim().split(/\s+/);
        var letters = words.length > 1
            ? words[0].charAt(0) + words[1].charAt(0)
            : words[0].slice(0, 2);

        return letters.toUpperCase();
    }

    /** Nama file -> URL aset; URL penuh (http/https atau diawali /) dipakai apa adanya. */
    function assetUrl(folder, file) {
        if (!file) {
            return '';
        }

        if (/^(https?:)?\/\//.test(file) || file.charAt(0) === '/') {
            return file;
        }

        return ASSET_BASE + '/images/' + folder + '/' + encodeURIComponent(file);
    }

    /* ==================================================================
     * Render
     * ================================================================== */

    /** Kartu pemain = foto saja (Figma). Tanpa foto: inisial + nama. */
    function playerFallback(player) {
        var box = el('div', 'pc-card__fallback');

        box.appendChild(el('span', 'pc-card__initials', initials(player.name)));
        box.appendChild(el('span', 'pc-card__name', player.name));

        if (player.team) {
            box.appendChild(el('span', 'pc-card__team', player.team));
        }

        return box;
    }

    function playerPhoto(player) {
        var url = assetUrl('players', player.photo);

        if (!url) {
            return playerFallback(player);
        }

        var img = el('img', 'pc-card__image');

        img.alt = 'Foto ' + player.name + (player.team ? ', ' + player.team : '');
        img.decoding = 'async';
        img.addEventListener('error', function () {
            if (img.parentNode) {
                img.parentNode.replaceChild(playerFallback(player), img);
            }
        }, { once: true });
        img.src = url;

        return img;
    }

    function renderPlayerCard(container, player) {
        container.textContent = '';
        container.setAttribute('aria-label',
            [player.name, player.team, player.role].filter(Boolean).join(', '));
        container.appendChild(playerPhoto(player));
    }

    var EMPTY_ICONS = {
        empty: '<svg viewBox="0 0 48 48" fill="none" focusable="false"><circle cx="24" cy="24" r="24" fill="currentColor"/>'
            + '<path d="M16 32V24M24 32V16M32 32V21" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
        error: '<svg viewBox="0 0 48 48" fill="none" focusable="false"><circle cx="24" cy="24" r="24" fill="currentColor"/>'
            + '<path d="M24 14v13" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="34" r="2.6" fill="#fff"/></svg>'
    };

    /** Isi state kosong/galat: ikon, judul, penjelasan, tombol "Coba Lagi". */
    function buildEmpty(kind, title, text, onRetry) {
        var box = el('div', 'pc-empty pc-empty--' + kind);
        var icon = el('span', 'pc-empty__icon');
        var button = el('button', 'pc-empty__button', 'Coba Lagi');

        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = EMPTY_ICONS[kind]; // string statis di atas, bukan data pengguna

        button.type = 'button';
        button.addEventListener('click', onRetry);

        box.appendChild(icon);
        box.appendChild(el('p', 'pc-empty__title', title));
        box.appendChild(el('p', 'pc-empty__text', text));
        box.appendChild(button);

        return box;
    }

    function renderTable(container, def, a, b) {
        container.textContent = '';

        if (!a[def.key] || !b[def.key]) {
            container.appendChild(buildEmpty('empty', 'Data belum tersedia', def.emptyText, update));
            return;
        }

        def.rows.forEach(function (row) {
            var valueA = row.format(row.get(a));
            var valueB = row.format(row.get(b));
            var item = el('div', 'pc-row');

            item.setAttribute('role', 'group');
            item.setAttribute('aria-label',
                row.label + ': ' + a.name + ' ' + valueA + ', ' + b.name + ' ' + valueB);

            [
                el('span', 'pc-row__a', valueA),
                el('span', 'pc-row__label', row.label),
                el('span', 'pc-row__b', valueB)
            ].forEach(function (cell) {
                cell.setAttribute('aria-hidden', 'true');
                item.appendChild(cell);
            });

            container.appendChild(item);
        });
    }

    function renderPerformance(container, a, b) {
        container.textContent = '';

        [[a, 'a'], [b, 'b']].forEach(function (pair) {
            var player = pair[0];
            var side = pair[1];
            var value = Math.max(0, Math.min(100, player.winRate));
            var item = el('div', 'pc-row');
            var bar = el('div', 'pc-bar');
            var fill = el('span', 'pc-bar__fill pc-bar__fill--' + side);

            fill.style.width = value + '%';
            bar.setAttribute('role', 'img');
            bar.setAttribute('aria-label', player.name + ' win rate ' + formatDecimal(value) + ' persen');
            bar.appendChild(fill);

            item.appendChild(el('span', 'pc-perf__name', player.name));
            item.appendChild(bar);
            item.appendChild(el('span', 'pc-perf__value', formatPercentDecimal(value)));
            container.appendChild(item);
        });
    }

    /* ==================================================================
     * Radar (Chart.js)
     * ================================================================== */
    var radarChart = null;
    var radarData = null;
    var compactQuery = window.matchMedia('(max-width: 575.98px)');

    /** Label sumbu: nama + nilai dua pemain ("biru | oranye") seperti di Figma. */
    var axisLabelsPlugin = {
        id: 'axisLabels',
        afterDraw: function (chart) {
            var scale = chart.scales.r;

            if (!scale) {
                return;
            }

            var ctx = chart.ctx;
            var compact = chart.width < 420;
            var gap = compact ? 10 : 14;
            var lineHeight = compact ? 12 : 15;
            var dataA = chart.data.datasets[0].data;
            var dataB = chart.data.datasets[1].data;

            ctx.save();
            ctx.textBaseline = 'middle';

            AXES.forEach(function (axis, index) {
                var point = scale.getPointPositionForValue(index, scale.max);
                var dx = point.x - scale.xCenter;
                var dy = point.y - scale.yCenter;
                var length = Math.hypot(dx, dy) || 1;
                var x = point.x + (dx / length) * gap;
                var y = point.y + (dy / length) * gap;

                var valueA = formatDecimal(dataA[index]);
                var valueB = formatDecimal(dataB[index]);
                var separator = ' | ';

                ctx.font = '600 ' + (compact ? 10.5 : 12) + 'px Poppins, sans-serif';
                var nameWidth = ctx.measureText(axis.label).width;

                ctx.font = '500 ' + (compact ? 9.5 : 10.5) + 'px Poppins, sans-serif';
                var widthA = ctx.measureText(valueA).width;
                var widthSep = ctx.measureText(separator).width;
                var widthB = ctx.measureText(valueB).width;
                var valuesWidth = widthA + widthSep + widthB;

                var blockWidth = Math.max(nameWidth, valuesWidth);
                var left = x;

                if (Math.abs(dx) < 4) {
                    left = x - blockWidth / 2;
                } else if (dx < 0) {
                    left = x - blockWidth;
                }

                // Blok teks (2 baris) ditempatkan di luar titik sumbu.
                var nameY;

                if (dy < -4) {
                    nameY = y - lineHeight;
                } else if (dy > 4) {
                    nameY = y;
                } else {
                    nameY = y - lineHeight / 2;
                }

                var valuesY = nameY + lineHeight;
                var nameLeft = left + (blockWidth - nameWidth) / 2;
                var valuesLeft = left + (blockWidth - valuesWidth) / 2;

                ctx.textAlign = 'left';
                ctx.font = '600 ' + (compact ? 10.5 : 12) + 'px Poppins, sans-serif';
                ctx.fillStyle = '#1E293B';
                ctx.fillText(axis.label, nameLeft, nameY);

                ctx.font = '500 ' + (compact ? 9.5 : 10.5) + 'px Poppins, sans-serif';
                ctx.fillStyle = TEXT_A;
                ctx.fillText(valueA, valuesLeft, valuesY);
                ctx.fillStyle = '#64748B';
                ctx.fillText(separator, valuesLeft + widthA, valuesY);
                ctx.fillStyle = TEXT_B;
                ctx.fillText(valueB, valuesLeft + widthA + widthSep, valuesY);
            });

            ctx.restore();
        }
    };

    function radarValues(player) {
        return AXES.map(function (axis) { return player.radar[axis.key]; });
    }

    function datasetFor(player, color) {
        return {
            label: player.name,
            data: radarValues(player),
            borderColor: color,
            backgroundColor: color + '26',
            borderWidth: 1.5,
            pointBackgroundColor: color,
            pointBorderColor: color,
            pointRadius: 3,
            pointHoverRadius: 4
        };
    }

    function buildRadar() {
        var canvas = byId('pc-radar-chart');

        if (!canvas || !radarData) {
            return;
        }

        if (radarChart) {
            radarChart.destroy();
            radarChart = null;
        }

        if (typeof Chart === 'undefined') {
            var box = canvas.parentNode;
            box.textContent = '';
            box.appendChild(el('p', 'pc-note', 'Grafik tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.'));
            return;
        }

        var compact = compactQuery.matches;
        var padding = compact
            ? { top: 36, bottom: 36, left: 80, right: 80 }
            : { top: 40, bottom: 40, left: 100, right: 100 };
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        Chart.defaults.font.family = 'Poppins, sans-serif';

        radarChart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: AXES.map(function (axis) { return axis.label; }),
                datasets: [
                    datasetFor(radarData.a, COLOR_A),
                    datasetFor(radarData.b, COLOR_B)
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: reduceMotion ? false : undefined,
                layout: { padding: padding },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + formatDecimal(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        startAngle: 330,
                        ticks: { display: false, stepSize: 25 },
                        grid: { color: 'rgba(25, 47, 83, 0.55)', lineWidth: 1 },
                        angleLines: { color: 'rgba(25, 47, 83, 0.55)', lineWidth: 1 },
                        // Label digambar oleh axisLabelsPlugin agar nilai dua pemain ikut tampil.
                        pointLabels: { display: false }
                    }
                }
            },
            plugins: [axisLabelsPlugin]
        });
    }

    function renderRadar(a, b) {
        radarData = { a: a, b: b };

        byId('pc-radar-chart').setAttribute('aria-label',
            'Grafik radar ' + a.name + ' dan ' + b.name + ' pada enam sumbu: ' +
            AXES.map(function (axis) { return axis.label; }).join(', '));

        if (radarChart) {
            radarChart.data.datasets[0] = datasetFor(a, COLOR_A);
            radarChart.data.datasets[1] = datasetFor(b, COLOR_B);
            radarChart.update();
        } else {
            buildRadar();
        }
    }

    // Padding label berbeda di mobile/desktop, jadi grafik dibangun ulang saat breakpoint berganti.
    var onBreakpointChange = function () {
        if (radarChart) {
            buildRadar();
        }
    };

    if (compactQuery.addEventListener) {
        compactQuery.addEventListener('change', onBreakpointChange);
    } else if (compactQuery.addListener) {
        compactQuery.addListener(onBreakpointChange);
    }

    /* ==================================================================
     * Elemen halaman dan tampilan (view)
     * ================================================================== */
    var lineupEl = byId('pc-lineup');
    var cardsEl = byId('pc-cards');
    var statusEl = byId('pc-status');
    var liveEl = byId('pc-live');
    var alertEl = byId('pc-alert');
    var noticeEl = byId('pc-notice');
    var skeletonEl = byId('pc-skeleton');
    var resultEl = byId('pc-result');
    var noteEl = byId('pc-note');

    // Sisi A (kiri, biru) dan B (kanan, oranye): tim, pemain, logo tim, kartu foto.
    var sides = ['a', 'b'].map(function (key) {
        var team = byId('pc-team-' + key);

        return {
            key: key,
            team: team,
            player: byId('pc-player-' + key),
            logo: team.parentNode.querySelector('.pc-select__logo'),
            card: byId('pc-card-' + key)
        };
    });

    var players = [];     // opsi dari getPlayerOptions()
    var teams = [];       // diturunkan dari players
    var hasTeams = false;
    var shown = null;     // pasangan terakhir yang berhasil ditampilkan
    var firstLoad = true; // true sampai muatan pertama selesai (pemilih tampil sebagai skeleton)
    var requestId = 0;
    var previewDone = false;

    function announce(message) {
        liveEl.textContent = message;
    }

    /**
     * Satu pintu untuk menampilkan bagian halaman:
     *   'loading'  skeleton + kartu kosong
     *   'result'   kartu foto + hasil perbandingan
     *   'keep'     pertahankan hasil terakhir bila ada (validasi, pilihan belum lengkap);
     *              `message` opsional tampil sebagai pesan netral di atasnya
     *   'notice'   data kosong / galat satu halaman
     */
    function setView(name, message) {
        var loading = name === 'loading';
        var showResult = name === 'result' || (name === 'keep' && Boolean(shown));

        skeletonEl.hidden = !loading;
        cardsEl.hidden = !(loading || showResult);
        cardsEl.classList.toggle('is-loading', loading);
        resultEl.hidden = !showResult;
        noticeEl.hidden = name !== 'notice';
        statusEl.hidden = !message;
        statusEl.textContent = message || '';
    }

    function showStatus(message) {
        setView('keep', message);
    }

    function showNotice(kind, title, text, onRetry) {
        noticeEl.textContent = '';
        noticeEl.appendChild(buildEmpty(kind, title, text, onRetry));
        noticeEl.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        setView('notice');
    }

    /** Pesan validasi pemain sama; kedua pemilih pemain ditandai tidak valid. */
    function setValidation(on) {
        alertEl.hidden = !on;

        sides.forEach(function (side) {
            if (on) {
                side.player.setAttribute('aria-invalid', 'true');
                side.player.setAttribute('aria-describedby', 'pc-alert');
            } else {
                side.player.removeAttribute('aria-invalid');
                side.player.removeAttribute('aria-describedby');
            }
        });
    }

    /** Muatan pertama selesai: pemilih berhenti tampil sebagai skeleton. */
    function settle() {
        if (!firstLoad) {
            return;
        }

        firstLoad = false;
        setSelectsLoading(false);
    }

    function setSelectsLoading(on) {
        lineupEl.classList.toggle('is-skeleton', on);

        sides.forEach(function (side) {
            side.team.disabled = on;
            side.player.disabled = on;
        });
    }

    /* ==================================================================
     * Pemilih tim + pemain
     * ================================================================== */
    function findPlayer(id) {
        return players.filter(function (player) { return String(player.id) === String(id); })[0] || null;
    }

    function findTeam(id) {
        return teams.filter(function (team) { return team.id === String(id); })[0] || null;
    }

    function deriveTeams() {
        var seen = {};

        teams = [];

        players.forEach(function (player) {
            if (player.teamId === undefined || player.teamId === null || player.teamId === '') {
                return;
            }

            var key = String(player.teamId);

            if (seen[key]) {
                if (!seen[key].logo && player.teamLogo) {
                    seen[key].logo = player.teamLogo;
                }
                return;
            }

            seen[key] = { id: key, name: player.team || ('Tim ' + key), logo: player.teamLogo || '' };
            teams.push(seen[key]);
        });

        teams.sort(function (x, y) { return x.name.localeCompare(y.name); });
        hasTeams = teams.length > 0;
    }

    function addOption(select, value, text) {
        var option = document.createElement('option');

        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }

    function fillTeams(side) {
        side.team.textContent = '';
        addOption(side.team, '', 'Pilih tim');

        teams.forEach(function (team) {
            addOption(side.team, team.id, team.name);
        });

        // Tanpa data tim, dropdown tim disembunyikan dan semua pemain tampil di dropdown pemain.
        side.team.parentNode.hidden = !hasTeams;
    }

    /** Dropdown pemain berisi pemain dari tim yang dipilih (atau semua pemain bila tim belum dipilih). */
    function fillPlayers(side) {
        var keep = side.player.value;
        var teamId = hasTeams ? side.team.value : '';
        var list = teamId
            ? players.filter(function (player) { return String(player.teamId) === teamId; })
            : players;

        side.player.textContent = '';
        addOption(side.player, '', side.key === 'a' ? 'Pemain A' : 'Pemain B');

        list.forEach(function (player) {
            addOption(side.player, String(player.id), player.name);
        });

        var stillListed = list.some(function (player) { return String(player.id) === keep; });

        side.player.value = stillListed ? keep : '';
    }

    function setLogo(side) {
        var team = findTeam(side.team.value);
        var url = team ? assetUrl('teams', team.logo) : '';

        if (!url) {
            side.logo.hidden = true;
            side.logo.removeAttribute('src');
            return;
        }

        side.logo.onerror = function () { side.logo.hidden = true; };
        side.logo.src = url;
        side.logo.hidden = false;
    }

    /** Memilih pemain otomatis menyelaraskan dropdown tim dengan tim pemain itu. */
    function syncTeamFromPlayer(side) {
        var player = findPlayer(side.player.value);

        if (!hasTeams || !player || player.teamId === undefined || player.teamId === null) {
            return;
        }

        if (String(player.teamId) !== side.team.value) {
            side.team.value = String(player.teamId);
            fillPlayers(side);
            setLogo(side);
        }
    }

    function selectPlayer(side, player) {
        if (hasTeams && player.teamId !== undefined && player.teamId !== null) {
            side.team.value = String(player.teamId);
        }

        fillPlayers(side);
        side.player.value = String(player.id);
        setLogo(side);
    }

    /* ==================================================================
     * Alur utama
     * ================================================================== */
    function update() {
        var valueA = sides[0].player.value;
        var valueB = sides[1].player.value;
        var current = ++requestId; // membatalkan permintaan yang masih berjalan

        setValidation(false);

        if (!valueA || !valueB) {
            settle();
            showStatus('Silakan pilih kedua pemain.');
            return;
        }

        // Pemain sama: tampilkan pesan, hasil terakhir dipertahankan (Figma).
        if (valueA === valueB) {
            settle();
            setView('keep');
            setValidation(true);
            return;
        }

        setView('loading');
        announce('Memuat perbandingan');

        fetchComparison(Number(valueA), Number(valueB)).then(function (data) {
            if (current !== requestId) {
                return;
            }

            shown = data;

            renderPlayerCard(sides[0].card, data.a);
            renderPlayerCard(sides[1].card, data.b);

            byId('pc-legend-a').textContent = data.a.name;
            byId('pc-legend-b').textContent = data.b.name;

            renderTable(byId('pc-league'), LEAGUE_TABLE, data.a, data.b);
            renderTable(byId('pc-detail'), DETAIL_TABLE, data.a, data.b);
            renderPerformance(byId('pc-perf'), data.a, data.b);

            setView('result');
            renderRadar(data.a, data.b);
            announce('Perbandingan ' + data.a.name + ' dan ' + data.b.name + ' sudah dimuat');
            settle();

            if (PREVIEW === 'validation' && !previewDone) {
                previewDone = true;
                selectPlayer(sides[1], findPlayer(sides[0].player.value));
                update();
            }
        }).catch(function (error) {
            if (current !== requestId) {
                return;
            }

            shown = null;
            announce('');
            settle();

            if (error && error.kind === 'empty') {
                showNotice('empty', 'Data belum tersedia',
                    'Perbandingan belum tersedia untuk pilihan pemain ini.', update);
            } else {
                if (window.console && console.error) {
                    console.error(error);
                }

                showNotice('error', 'Data gagal dimuat',
                    'Perbandingan belum dapat dimuat. Periksa koneksi lalu coba lagi.', update);
            }
        });
    }

    function boot() {
        firstLoad = true;
        shown = null;
        setValidation(false);
        setSelectsLoading(true);
        setView('loading');
        announce('Memuat perbandingan');

        getPlayerOptions().then(function (options) {
            players = options || [];

            if (!players.length) {
                settle();
                showNotice('empty', 'Data belum tersedia', 'Belum ada data pemain.', boot);
                return;
            }

            deriveTeams();

            sides.forEach(function (side) {
                fillTeams(side);
                fillPlayers(side);
                setLogo(side);
            });

            // Pilihan awal seperti di Figma: dua pemain pertama.
            if (players.length > 1) {
                selectPlayer(sides[0], players[0]);
                selectPlayer(sides[1], players[1]);
            }

            update();
        }).catch(function (error) {
            if (window.console && console.error) {
                console.error(error);
            }

            settle();
            showNotice('error', 'Data gagal dimuat',
                'Daftar pemain belum dapat dimuat. Periksa koneksi lalu coba lagi.', boot);
        });
    }

    sides.forEach(function (side) {
        side.team.addEventListener('change', function () {
            fillPlayers(side);
            setLogo(side);
            update();
        });

        side.player.addEventListener('change', function () {
            syncTeamFromPlayer(side);
            update();
        });
    });

    byId('pc-alert-close').addEventListener('click', function () {
        alertEl.hidden = true;
        sides[1].player.focus();
    });

    noteEl.hidden = !USING_DUMMY;

    boot();
}());
