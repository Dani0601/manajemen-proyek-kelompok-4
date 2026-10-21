/**
 * Halaman Perbandingan Pemain.
 *
 * Alur: getPlayerOptions() -> isi dropdown -> getPlayerComparison(idA, idB)
 *       -> render kartu pemain, radar, statistik, dan win rate.
 *
 * Hanya DUA fungsi di bagian "SUMBER DATA" yang perlu diganti FE2 saat API
 * siap. Semua fungsi render di bawahnya hanya membaca bentuk data yang sama
 * dan tidak mengetahui dari mana data berasal.
 */
(function () {
    'use strict';

    var root = document.querySelector('.pc');

    if (!root) {
        return;
    }

    var ASSET_BASE = root.getAttribute('data-asset-base') || '';
    var COLOR_A = '#3478F6';
    var COLOR_B = '#F28C28';

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

    var LEAGUE_ROWS = [
        { label: 'Match dimainkan', get: function (p) { return p.league.matches; }, format: formatInt },
        { label: 'KDA rata-rata', get: function (p) { return p.league.kdaAverage; }, format: formatDecimal },
        { label: 'Kill Participation', get: function (p) { return p.league.killParticipation; }, format: formatPercentInt }
    ];

    var DETAIL_ROWS = [
        { label: 'Gold per menit', get: function (p) { return p.detail.goldPerMinute; }, format: formatInt },
        { label: 'Damage per menit', get: function (p) { return p.detail.damagePerMinute; }, format: formatThousands },
        { label: 'Objective dikuasai', get: function (p) { return p.detail.objectiveControl; }, format: formatInt }
    ];

    /* ==================================================================
     * SUMBER DATA (DUMMY)
     * Data contoh untuk pratinjau UI, BUKAN statistik MPL resmi.
     * Nilai radar adalah angka contoh. Ganti dua fungsi di bawah dengan
     * fetch ke API (FE2); jangan ubah fungsi render.
     *
     * Bentuk data pemain:
     * { id, name, team, teamLogo, role, hero, image,
     *   radar:  { killPower, farmRate, objective, survival, teamfight, versatility },
     *   league: { matches, kdaAverage, killParticipation },
     *   detail: { goldPerMinute, damagePerMinute, objectiveControl },
     *   winRate }
     * ================================================================== */
    var DUMMY_PLAYERS = [
        {
            id: 101, name: 'Kairi', team: 'ONIC Esports', teamLogo: 'onic.png',
            role: 'Jungler', hero: 'Lancelot', image: 'kairi.png',
            radar: { killPower: 84.2, farmRate: 62.7, objective: 55.0, survival: 58.5, teamfight: 82.0, versatility: 71.3 },
            league: { matches: 48, kdaAverage: 5.2, killParticipation: 74 },
            detail: { goldPerMinute: 812, damagePerMinute: 1240, objectiveControl: 31 },
            winRate: 68.7
        },
        {
            id: 102, name: 'Albertt', team: 'ONIC Esports', teamLogo: 'onic.png',
            role: 'Jungler', hero: 'Ling', image: 'albertt.png',
            radar: { killPower: 66.4, farmRate: 51.9, objective: 49.5, survival: 63.8, teamfight: 74.6, versatility: 58.2 },
            league: { matches: 45, kdaAverage: 4.8, killParticipation: 71 },
            detail: { goldPerMinute: 790, damagePerMinute: 1130, objectiveControl: 34 },
            winRate: 64.2
        },
        {
            id: 103, name: 'Pemain C', team: 'Tim Contoh', teamLogo: 'contoh.png',
            role: 'Gold Laner', hero: 'Beatrix', image: 'pemain-c.png',
            radar: { killPower: 72.0, farmRate: 80.4, objective: 40.2, survival: 55.1, teamfight: 61.7, versatility: 66.0 },
            league: { matches: 40, kdaAverage: 4.1, killParticipation: 66 },
            detail: { goldPerMinute: 905, damagePerMinute: 1310, objectiveControl: 18 },
            winRate: 58.3
        },
        {
            id: 104, name: 'Pemain D', team: 'Tim Contoh', teamLogo: 'contoh.png',
            role: 'EXP Laner', hero: 'Fanny', image: 'pemain-d.png',
            radar: { killPower: 77.5, farmRate: 59.0, objective: 61.4, survival: 48.9, teamfight: 69.2, versatility: 52.8 },
            league: { matches: 36, kdaAverage: 3.9, killParticipation: 69 },
            detail: { goldPerMinute: 760, damagePerMinute: 1180, objectiveControl: 26 },
            winRate: 55.0
        }
    ];

    function getPlayerOptions() {
        return Promise.resolve(DUMMY_PLAYERS.map(function (player) {
            return { id: player.id, name: player.name, team: player.team };
        }));
    }

    function getPlayerComparison(idA, idB) {
        var find = function (id) {
            return DUMMY_PLAYERS.filter(function (player) { return player.id === id; })[0];
        };
        var a = find(idA);
        var b = find(idB);

        if (!a || !b) {
            return Promise.reject(new Error('Pemain tidak ditemukan'));
        }

        return Promise.resolve({ a: a, b: b });
    }

    /* ==================================================================
     * Helper DOM
     * ================================================================== */
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

    /** Gambar dengan avatar inisial sebagai cadangan jika file belum ada. */
    function imageOrAvatar(folder, file, alt, className, fallbackText) {
        var avatar = function () {
            var node = el('span', className + ' pc-avatar', fallbackText);
            node.setAttribute('role', 'img');
            node.setAttribute('aria-label', alt || 'Gambar belum tersedia');
            return node;
        };

        var img = el('img', className);
        img.src = ASSET_BASE + '/images/' + folder + '/' + encodeURIComponent(file);
        img.alt = alt;
        img.loading = 'lazy';
        img.addEventListener('error', function () {
            if (img.parentNode) {
                img.parentNode.replaceChild(avatar(), img);
            }
        }, { once: true });

        return img;
    }

    /* ==================================================================
     * Render
     * ================================================================== */
    function renderPlayerCard(container, player) {
        container.textContent = '';
        container.setAttribute('aria-label', player.name + ', ' + player.hero);

        container.appendChild(imageOrAvatar(
            'players', player.image, player.hero, 'pc-player__image',
            player.hero.charAt(0).toUpperCase()
        ));

        var info = el('div', 'pc-player__info');
        info.appendChild(el('h3', 'pc-player__name', player.hero));

        var team = el('div', 'pc-player__team');
        team.appendChild(imageOrAvatar('teams', player.teamLogo, '', 'pc-team__logo', initials(player.team)));

        var text = el('div', 'pc-team__text');
        text.appendChild(el('span', '', player.team));
        text.appendChild(el('span', '', player.role));
        team.appendChild(text);

        info.appendChild(team);
        container.appendChild(info);
    }

    function renderRows(container, rows, a, b) {
        container.textContent = '';

        rows.forEach(function (row) {
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
                ctx.fillStyle = COLOR_A;
                ctx.fillText(valueA, valuesLeft, valuesY);
                ctx.fillStyle = '#64748B';
                ctx.fillText(separator, valuesLeft + widthA, valuesY);
                ctx.fillStyle = COLOR_B;
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
        var canvas = document.getElementById('pc-radar-chart');

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

        document.getElementById('pc-radar-chart').setAttribute('aria-label',
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
     * Pilihan pemain, validasi, dan alur utama
     * ================================================================== */
    var selectA = document.getElementById('pc-player-a');
    var selectB = document.getElementById('pc-player-b');
    var statusEl = document.getElementById('pc-status');
    var resultEl = document.getElementById('pc-result');
    var requestId = 0;

    function setStatus(message) {
        if (message) {
            statusEl.textContent = message;
            statusEl.hidden = false;
        } else {
            statusEl.textContent = '';
            statusEl.hidden = true;
        }
    }

    function showResult(visible) {
        resultEl.hidden = !visible;
    }

    /** Pemain yang dipilih di satu dropdown dinonaktifkan di dropdown lainnya. */
    function syncDisabledOptions() {
        [[selectA, selectB], [selectB, selectA]].forEach(function (pair) {
            var own = pair[0];
            var other = pair[1];

            Array.prototype.forEach.call(own.options, function (option) {
                option.disabled = option.value !== '' && option.value === other.value;
            });
        });
    }

    function fillSelect(select, options) {
        options.forEach(function (player) {
            var option = document.createElement('option');
            option.value = String(player.id);
            option.textContent = player.name;
            select.appendChild(option);
        });
    }

    function update() {
        syncDisabledOptions();

        var valueA = selectA.value;
        var valueB = selectB.value;

        if (!valueA || !valueB) {
            setStatus('Silakan pilih kedua pemain.');
            showResult(false);
            return;
        }

        if (valueA === valueB) {
            setStatus('Pilih dua pemain yang berbeda untuk dibandingkan.');
            showResult(false);
            return;
        }

        var current = ++requestId;

        setStatus('');
        resultEl.classList.add('is-loading');
        resultEl.setAttribute('aria-busy', 'true');

        getPlayerComparison(Number(valueA), Number(valueB)).then(function (data) {
            if (current !== requestId) {
                return;
            }

            renderPlayerCard(document.getElementById('pc-card-a'), data.a);
            renderPlayerCard(document.getElementById('pc-card-b'), data.b);

            document.getElementById('pc-legend-a').textContent = data.a.name;
            document.getElementById('pc-legend-b').textContent = data.b.name;

            renderRows(document.getElementById('pc-league'), LEAGUE_ROWS, data.a, data.b);
            renderRows(document.getElementById('pc-detail'), DETAIL_ROWS, data.a, data.b);
            renderPerformance(document.getElementById('pc-perf'), data.a, data.b);

            showResult(true);
            renderRadar(data.a, data.b);
        }).catch(function () {
            if (current === requestId) {
                setStatus('Data perbandingan belum dapat dimuat. Silakan coba lagi.');
                showResult(false);
            }
        }).then(function () {
            if (current === requestId) {
                resultEl.classList.remove('is-loading');
                resultEl.removeAttribute('aria-busy');
            }
        });
    }

    selectA.addEventListener('change', update);
    selectB.addEventListener('change', update);

    setStatus('Memuat daftar pemain...');

    getPlayerOptions().then(function (options) {
        if (!options.length) {
            setStatus('Belum ada data pemain.');
            return;
        }

        fillSelect(selectA, options);
        fillSelect(selectB, options);

        // Pilihan awal seperti di Figma: dua pemain pertama.
        if (options.length > 1) {
            selectA.value = String(options[0].id);
            selectB.value = String(options[1].id);
        }

        update();
    }).catch(function () {
        setStatus('Daftar pemain belum dapat dimuat. Silakan coba lagi.');
    });
}());
