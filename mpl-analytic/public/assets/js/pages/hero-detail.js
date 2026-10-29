/**
 * Detail Hero — FE1 (tampilan) + titik sambung untuk FE2 (API).
 *
 * KONTRAK UNTUK FE2: docs/hero-detail-kontrak.md
 *  0) Alamat: /hero-detail?id=<hero_id> (tanpa id + API aktif => "Hero belum dipilih").
 *  1) Tambahkan  ApiClient.getHeroDetail(heroId)  di api-client.js.
 *     Jika ada, halaman memakainya otomatis; jika tidak, memakai data contoh.
 *  2) Petakan respons backend -> bentuk kontrak HANYA di fungsi normalizeHeroDetail().
 *  3) State: HeroDetail.setState(section, 'loading'|'empty'|'error'|'ready')
 *     Tombol "Coba Lagi" memicu event 'herodetail:retry' (cancelable).
 */
(function () {
    'use strict';

    var root = document.getElementById('hero-detail');

    if (!root) {
        return;
    }

    var ASSET_BASE = root.getAttribute('data-asset-base') || '';
    var HERO_ID = Number(root.getAttribute('data-hero-id')) || 0;
    var SECTIONS = ['banner', 'build', 'skills', 'ratings', 'stats', 'counters', 'note'];
    var SKILL_LABELS = { passive: 'Pasif', skill1: 'Skill 1', skill2: 'Skill 2', ultimate: 'Ultimate' };
    var STATE_COPY = {
        empty: { title: 'Data belum tersedia', text: 'Saat ini belum ada data untuk ditampilkan. Silakan coba lagi nanti atau jelajahi fitur lainnya.' },
        error: { title: 'Data gagal dimuat', text: 'Terjadi kendala saat mengambil data. Periksa koneksi internet Anda lalu coba lagi.' }
    };
    var BUILD_EMPTY = { title: 'Belum ada data build', text: 'Build item, emblem, dan battle spell untuk hero ini belum tersedia.' };

    /* ==================================================================
     * DATA CONTOH (bukan data resmi) — dipakai selama API belum tersambung.
     * Gambar null -> tampil avatar inisial. Pasang URL/berkas aset di sini
     * atau (lebih baik) dari API: items/, emblems/, heroes/ di assets/images.
     * ================================================================== */
  
var DUMMY = {
    hero: {
        hero_id: 1,
        hero_name: 'Hero Contoh',
        banner_url: 'banner-detail-hero.png'
    },

    build: {
        items: [
            { slot: 1, name: 'Arcane Boots', image_url: 'arcane-boots.png' },
            { slot: 2, name: 'Warrior Boots', image_url: 'warrior-boots.png' },
            { slot: 3, name: 'Bloodlust Axe', image_url: 'bloodlust-axe.png' },
            { slot: 4, name: 'Swift Boots', image_url: 'swift-boots.png' },
            { slot: 5, name: 'Guardian Helmet', image_url: 'guardian-helmet.png' },
            { slot: 6, name: 'Antique Cuirass', image_url: 'antique-cuirass.png' }
        ],

        emblem: {
            name: 'Fighter emblem',
            image_url: 'emblem-fighter.png',
            talents: [
                { name: 'Talent 1', image_url: 'talent-1.png' },
                { name: 'Talent 2', image_url: 'talent-2.png' },
                { name: 'Talent 3', image_url: 'talent-3.png' }
            ]
        },

        battle_spell: {
            name: 'Sprint',
            image_url: 'spell-sprint.png'
        }
    },

    skills: [
        { type: 'passive', name: 'Pasif', image_url: 'pasif.png' },
        { type: 'skill1', name: 'Skill 1', image_url: 'skill1.png' },
        { type: 'skill2', name: 'Skill 2', image_url: 'skill2.png' },
        { type: 'ultimate', name: 'Ultimate', image_url: 'ultimate.png' }
    ],

    ratings: {
        offense: 7,
        durability: 3,
        control_effects: 1,
        difficulty: 4
    },

    stats: {
        win_rate: 59.97,
        pick_rate: 18.6,
        ban_rate: 39.26
    },

    counters: {
        favorable: [
            { hero_id: 2, hero_name: 'Tigreal', hero_url: 'tigreal.png', win_rate: 58.4 },
            { hero_id: 3, hero_name: 'Khufra', hero_url: 'khufra.png', win_rate: 56.9 },
            { hero_id: 4, hero_name: 'Johnson', hero_url: 'johnson.png', win_rate: 55.2 }
        ],
        unfavorable: [
            { hero_id: 5, hero_name: 'Hayabusa', hero_url: 'hayabusa.png', win_rate: 49.1 },
            { hero_id: 6, hero_name: 'Natalia', hero_url: 'natalia.png', win_rate: 47.8 },
            { hero_id: 7, hero_name: 'Lancelot', hero_url: 'lancelot.png', win_rate: 46.3 }
        ]
    },

    situational_note: 'Gunakan item defense sesuai tipe damage lawan.'
};


    /* ==================================================================
     * TITIK SAMBUNG FE2 — hanya dua fungsi ini yang perlu disentuh.
     * ================================================================== */
    function fetchHeroDetail(heroId) {
        if (window.ApiClient && typeof window.ApiClient.getHeroDetail === 'function') {
            return window.ApiClient.getHeroDetail(heroId).then(normalizeHeroDetail);
        }

        return Promise.resolve(DUMMY);
    }

    /** Petakan respons backend ke bentuk kontrak (lihat docs/hero-detail-kontrak.md). */
    function normalizeHeroDetail(raw) {
        return raw; // FE2: ubah di sini jika nama field backend berbeda.
    }

    /* ------------------------------------------------------------------ */
    var $ = function (id) { return document.getElementById(id); };

    function el(tag, className, text) {
        var node = document.createElement(tag);

        if (className) { node.className = className; }
        if (text !== undefined && text !== null) { node.textContent = text; }

        return node;
    }

    function percent(value) {
        var n = Number(value);

        return Number.isFinite(n) ? n.toFixed(2) + '%' : '-';
    }

    function clamp(value) {
        var n = Number(value);

        return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    }

    function hasText(value) { return typeof value === 'string' && value.trim() !== ''; }
    function list(value) { return Array.isArray(value) ? value : []; }

    /** Gambar dari URL penuh atau nama berkas di assets/images/<folder>; cadangan: avatar inisial. */
    function image(folder, source, alt, className, fallback) {
        var avatar = function () {
            var node = el('span', className + ' hd-avatar', fallback);

            node.setAttribute('role', 'img');
            node.setAttribute('aria-label', alt);

            return node;
        };

        if (!hasText(source)) {
            return avatar();
        }

        var img = el('img', className);

        img.src = /^(https?:)?\/\//.test(source) || source.charAt(0) === '/'
            ? source
            : ASSET_BASE + '/images/' + folder + '/' + encodeURIComponent(source);
        img.alt = alt;
        img.loading = 'lazy';
        img.addEventListener('error', function () {
            if (img.parentNode) { img.parentNode.replaceChild(avatar(), img); }
        }, { once: true });

        return img;
    }

    function initial(name) { return String(name || '?').trim().charAt(0).toUpperCase(); }

    /* ---------------------------- Render ------------------------------ */
    function renderBanner(hero) {
        var img = $('hd-banner-img');
        var name = (hero && hero.hero_name) || 'Hero';

        $('hd-hero-name').textContent = name;
        img.alt = 'Ilustrasi ' + name;

        if (hasText(hero && hero.banner_url)) {
            img.src = /^(https?:)?\/\//.test(hero.banner_url) || hero.banner_url.charAt(0) === '/'
                ? hero.banner_url
                : ASSET_BASE + '/images/heroes/' + encodeURIComponent(hero.banner_url);
        } else {
            img.removeAttribute('src');
        }

        img.addEventListener('error', function () { img.removeAttribute('src'); }, { once: true });

        document.title = name + ' | Detail Hero | MLBB Guide';
    }

    function renderBuild(build) {
        var items = list(build && build.items).slice().sort(function (a, b) { return a.slot - b.slot; }).slice(0, 6);
        var ol = $('hd-build-items');

        ol.textContent = '';

        // Selalu 6 slot; slot tanpa data tampil sebagai kotak kosong bernama "-".
        for (var slot = 1; slot <= 6; slot += 1) {
            var data = items.filter(function (item) { return Number(item.slot) === slot; })[0] || { slot: slot, name: '-', image_url: null };
            var li = el('li', 'hd-item');
            var media = el('div', 'hd-item__media');

            media.appendChild(el('span', 'hd-item__slot', String(slot)));
            media.appendChild(image('items', data.image_url, data.name, 'hd-item__image', initial(data.name)));
            li.appendChild(media);
            li.appendChild(el('span', 'hd-item__name', data.name));
            ol.appendChild(li);
        }

        var emblem = (build && build.emblem) || {};
        var emblemBox = $('hd-emblem');
        var text = el('div', 'hd-setup__text');
        var talents = el('ul', 'hd-talents');

        emblemBox.textContent = '';
        emblemBox.appendChild(image('emblems', emblem.image_url, emblem.name || 'Emblem', 'hd-setup__icon', initial(emblem.name)));
        text.appendChild(el('p', 'hd-setup__label', 'Emblem setup'));
        text.appendChild(el('p', 'hd-setup__name', emblem.name || '-'));
        emblemBox.appendChild(text);

        list(emblem.talents).slice(0, 3).forEach(function (talent) {
            var li = el('li', 'hd-talent');

            li.appendChild(image('emblems', talent.image_url, talent.name || 'Talent', 'hd-talent__image', initial(talent.name)));
            talents.appendChild(li);
        });
        emblemBox.appendChild(talents);

        var spell = (build && build.battle_spell) || {};
        var spellBox = $('hd-spell');
        var spellText = el('div', 'hd-setup__text');

        spellBox.textContent = '';
        spellBox.appendChild(image('emblems', spell.image_url, spell.name || 'Battle spell', 'hd-setup__icon', initial(spell.name)));
        spellText.appendChild(el('p', 'hd-setup__label', 'Battle spell'));
        spellText.appendChild(el('p', 'hd-setup__name', spell.name || '-'));
        spellBox.appendChild(spellText);
    }

    function renderSkills(skills) {
        var ul = $('hd-skills');

        ul.textContent = '';
        list(skills).slice(0, 4).forEach(function (skill) {
            var label = SKILL_LABELS[skill.type] || skill.name || 'Skill';
            var li = el('li', 'hd-skill');
            var media = el('div', 'hd-skill__media');

            media.appendChild(image('heroes', skill.image_url, skill.name || label, 'hd-item__image', initial(label)));
            li.appendChild(media);
            li.appendChild(el('span', 'hd-skill__label', label));
            ul.appendChild(li);
        });
    }

    function renderRatings(ratings) {
        var dl = $('hd-ratings');
        var rows = [['Offense', 'offense'], ['Durability', 'durability'], ['Control Effects', 'control_effects'], ['Difficulty', 'difficulty']];

        dl.textContent = '';
        rows.forEach(function (row) {
            var value = Math.max(0, Math.min(10, Math.round(Number((ratings || {})[row[1]]) || 0)));
            var wrap = el('div', 'hd-rating');
            var blocks = el('div', 'hd-rating__blocks');
            var dd = el('dd');

            for (var i = 1; i <= 10; i += 1) {
                blocks.appendChild(el('span', 'hd-rating__block' + (i <= value ? ' is-filled' : '')));
            }

            blocks.setAttribute('role', 'img');
            blocks.setAttribute('aria-label', row[0] + ' ' + value + ' dari 10');
            dd.appendChild(blocks);
            wrap.appendChild(el('dt', '', row[0]));
            wrap.appendChild(dd);
            wrap.appendChild(el('span', 'hd-rating__value', String(value)));
            dl.appendChild(wrap);
        });
    }

    function bar(value, tone, label) {
        var track = el('div', 'hd-bar');
        var fill = el('span', 'hd-bar__fill hd-tone--' + tone);

        fill.style.width = clamp(value) + '%';
        track.setAttribute('role', 'img');
        track.setAttribute('aria-label', label + ' ' + percent(value));
        track.appendChild(fill);

        return track;
    }

    function renderStats(stats) {
        var ul = $('hd-stats');

        ul.textContent = '';
        [['Win Rate', 'win_rate', 'blue'], ['Pick Rate', 'pick_rate', 'red'], ['Ban Rate', 'ban_rate', 'orange']].forEach(function (row) {
            var li = el('li', 'hd-stat');
            var value = (stats || {})[row[1]];

            li.appendChild(el('span', 'hd-stat__label', row[0]));
            li.appendChild(bar(value, row[2], row[0]));
            li.appendChild(el('span', 'hd-stat__value hd-tone--' + row[2], percent(value)));
            ul.appendChild(li);
        });
    }

    function renderCounters(target, heroes, tone) {
        var ul = $(target);

        ul.textContent = '';
        list(heroes).slice(0, 3).forEach(function (hero) {
            var li = el('li', 'hd-counter-row');

            li.appendChild(image('heroes', hero.hero_url, hero.hero_name, 'hd-counter-row__image', initial(hero.hero_name)));
            li.appendChild(el('span', 'hd-counter-row__name', hero.hero_name));
            li.appendChild(bar(hero.win_rate, tone, hero.hero_name));
            li.appendChild(el('span', 'hd-counter-row__value hd-tone--' + tone, percent(hero.win_rate)));
            ul.appendChild(li);
        });
    }

    /* ---------------------------- State ------------------------------- */
    function parts(name) {
        var section = document.querySelector('[data-hd-section="' + name + '"]');
        var panel = section ? section.querySelector('[data-hd-panel]') : null;
        var slot = panel ? panel.querySelector(':scope > .hd-state-slot') : null;

        return section && panel && slot ? { section: section, panel: panel, slot: slot } : null;
    }

    function skeleton(name) {
        var box = el('div', 'hd-skel-grid');
        var count = { build: 6, skills: 4, banner: 0, note: 0 }[name];

        box.setAttribute('aria-hidden', 'true');

        if (name === 'banner') {
            var big = el('span', 'hd-skel');

            big.style.aspectRatio = '3.2 / 1';
            box.appendChild(big);
        } else if (name === 'note') {
            box.appendChild(el('span', 'hd-skel hd-skel--line'));
        } else if (count) {
            box.style.gridTemplateColumns = 'repeat(' + count + ', minmax(0, 1fr))';
            for (var i = 0; i < count; i += 1) {
                var cell = el('div', 'hd-skel-cell');

                cell.appendChild(el('span', 'hd-skel'));
                cell.appendChild(el('span', 'hd-skel hd-skel--line'));
                cell.lastChild.style.width = '70%';
                box.appendChild(cell);
            }
        } else {
            for (var r = 0; r < 3; r += 1) {
                var row = el('div', 'hd-skel-row');

                row.appendChild(el('span', 'hd-skel hd-skel--line'));
                row.appendChild(el('span', 'hd-skel hd-skel--line'));
                row.appendChild(el('span', 'hd-skel hd-skel--line'));
                box.appendChild(row);
            }
        }

        return box;
    }

    function messageBox(kind, name, options) {
        var copy = Object.assign({}, name === 'build' && kind === 'empty' ? BUILD_EMPTY : STATE_COPY[kind], options);
        var box = el('div', 'hd-empty');
        var icon = el('span', 'hd-empty__icon');
        var img = el('img');
        var button = el('button', 'hd-empty__button', 'Coba Lagi');

        box.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        img.src = ASSET_BASE + '/images/icons/' + encodeURIComponent('Bar Chart.png');
        img.alt = '';
        img.width = 24;
        img.height = 24;
        icon.appendChild(img);
        box.append(icon, el('h3', 'hd-empty__title', copy.title), el('p', 'hd-empty__text', copy.text));
        button.type = 'button';
        button.addEventListener('click', function () {
            var event = new CustomEvent('herodetail:retry', { detail: { section: name }, cancelable: true });

            if (document.dispatchEvent(event)) {
                load();
            }
        });
        box.appendChild(button);

        return box;
    }

    function setState(name, state, options) {
        var target = parts(name);

        if (!target) { return; }

        if (state === 'ready') {
            target.slot.replaceChildren();
            target.slot.hidden = true;
            target.panel.classList.remove('is-stated');
            target.panel.removeAttribute('aria-busy');
            target.section.dataset.state = 'ready';

            return;
        }

        var content = state === 'loading' ? skeleton(name) : messageBox(state, name, options);

        target.slot.replaceChildren(content);
        target.slot.hidden = false;
        target.panel.classList.add('is-stated');
        target.section.dataset.state = state;

        if (state === 'loading') { target.panel.setAttribute('aria-busy', 'true'); } else { target.panel.removeAttribute('aria-busy'); }
    }

    function setAll(state, options) {
        SECTIONS.forEach(function (name) { setState(name, state, options); });

        var label = $('hd-page-loading');

        if (state === 'loading') {
            // Teks loading terlihat di bawah halaman, sama seperti Dashboard.
            var visible = document.querySelector('.hd-loading-text');

            if (!visible) {
                visible = el('p', 'hd-loading-text');
                visible.setAttribute('role', 'status');
                visible.appendChild(el('span', 'hd-spinner'));
                visible.firstChild.setAttribute('aria-hidden', 'true');
                visible.appendChild(document.createTextNode('Memuat detail hero'));
                root.appendChild(visible);
            }
        } else {
            var old = document.querySelector('.hd-loading-text');

            if (old) { old.remove(); }
        }

        if (label) { label.textContent = ''; }
    }

    /* ---------------------------- Alur -------------------------------- */
    function render(data) {
        var d = data || {};
        var hasBuild = d.build && list(d.build.items).length > 0;

        renderBanner(d.hero);
        renderBuild(d.build);
        renderSkills(d.skills);
        renderRatings(d.ratings);
        renderStats(d.stats);
        renderCounters('hd-counter-favorable', d.counters && d.counters.favorable, 'blue');
        renderCounters('hd-counter-unfavorable', d.counters && d.counters.unfavorable, 'orange');
        $('hd-note').textContent = hasText(d.situational_note) ? d.situational_note : '';

        setAll('ready');

        // Hero tanpa data build -> "Belum ada data build" (kartu Trello 4.2).
        if (!hasBuild) { setState('build', 'empty'); }
        if (list(d.skills).length === 0) { setState('skills', 'empty'); }
        if (!d.ratings) { setState('ratings', 'empty'); }
        if (!d.stats) { setState('stats', 'empty'); }

        var c = d.counters || {};

        if (list(c.favorable).length === 0 && list(c.unfavorable).length === 0) { setState('counters', 'empty'); }
        if (!hasText(d.situational_note)) { setState('note', 'empty'); }

        $('hd-dummy-note').hidden = !(d === DUMMY);
    }

    function apiReady() {
        return !!(window.ApiClient && typeof window.ApiClient.getHeroDetail === 'function');
    }

    /** Halaman dibuka tanpa ?id= (mis. lewat menu Hero): minta pengguna memilih hero dari Dashboard. */
    function showNoHero() {
        root.classList.add('hd--no-hero');
        $('hd-no-hero').hidden = false;
    }

    function load() {
        // Dengan API aktif, id wajib ada. Tanpa API, data contoh tetap tampil untuk pratinjau.
        if (HERO_ID <= 0 && apiReady()) {
            showNoHero();

            return Promise.resolve();
        }

        setAll('loading');

        return fetchHeroDetail(HERO_ID).then(render).catch(function () {
            setAll('error');
        });
    }

    // Pratinjau QA tanpa API: ?state=loading | empty | error | no-build | no-hero
    function preview() {
        var state = new URLSearchParams(window.location.search).get('state');

        if (state === 'no-hero') { showNoHero(); return true; }
        if (state === 'loading') { setAll('loading'); return true; }
        if (state === 'empty' || state === 'error') { setAll(state); return true; }
        if (state === 'no-build') {
            var data = JSON.parse(JSON.stringify(DUMMY));

            data.build = { items: [], emblem: null, battle_spell: null };
            render(data);
            return true;
        }

        return false;
    }

    window.HeroDetail = { render: render, setState: setState, setAll: setAll, load: load };

    document.addEventListener('DOMContentLoaded', function () {
        if (!preview()) { load(); }
    });
}());
