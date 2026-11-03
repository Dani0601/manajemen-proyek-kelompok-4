document.addEventListener("DOMContentLoaded", () => {
    const HeroDetail = (function () {
        // 1. Deklarasi Elemen Utama
        const container = document.getElementById("hero-detail");
        const dummyNote = document.getElementById("hd-dummy-note");
        const counterContainer = document.getElementById("hd-counters");
        const buildItemsContainer = document.getElementById("hd-build-items");
        const emblemContainer = document.getElementById("hd-emblem");
        const spellContainer = document.getElementById("hd-spell");
        const skillContainer = document.getElementById("hd-skills");
        const bannerImg = document.getElementById("hd-banner-img");

        // 2. Inisialisasi
        async function init() {
            if (!container) return;

            const urlParams = new URLSearchParams(window.location.search);
            const heroId = urlParams.get("id") || container.getAttribute("data-hero-id");

            if (!heroId || heroId === "0") {
                setSectionState("build", "empty");
                return;
            }

            setSectionState("build", "loading");
            await fetchHeroDetail(heroId);
        }

        // 3. API Fetch
        async function fetchHeroDetail(heroId) {
            if (!window.ApiClient || !window.ApiClient.getHeroDetail) {
                console.error("ApiClient.getHeroDetail tidak ditemukan.");
                setSectionState("build", "error");
                return;
            }
            console.log("RADAR 1: Mulai ambil API untuk ID", heroId);
            const rawData = await window.ApiClient.getHeroDetail(heroId);
            console.log("RADAR 2: Data mentah berhasil didapat", rawData);
            const normalizedData = normalizeHeroDetail(rawData);
            console.log("RADAR 3: Data berhasil dinormalisasi", normalizedData);
            render(normalizedData);
        }

        // 4. Normalisasi Data
        function normalizeHeroDetail(raw) {
            if (!raw) return { build: { hasBuild: false }, skills: [], bannerUrl: "", heroName: "" };

            const buildData = raw.buildRaw || {};
            const detailData = raw.detailRaw || {};
            const skillsRaw = raw.skillsRaw || {};
            const situationalSwaps = raw.situational_swaps 
                                  || detailData.situational_swaps 
                                  || buildData.situational_swaps 
                                  || (raw.data && raw.data.situational_swaps) 
                                  || [];
            console.log("RADAR SITUASIONAL 1: Data mentah berhasil diekstrak:", situationalSwaps);
            const items = buildData.items || [];
            const hasBuild = items.length > 0;


            let cleanSpellName = "";
            if (buildData.spells && buildData.spells.length > 0) {
                cleanSpellName = buildData.spells[0].spell_name.replace("ALSO ", "").trim();
            }

            let cleanEmblemName = "";
            if (detailData.recommendations && detailData.recommendations.emblems && detailData.recommendations.emblems.length > 0) {
                cleanEmblemName = detailData.recommendations.emblems[0].name;
            }

            let heroSkills = [];
            const skillsArray = skillsRaw.skills || [];
            if (Array.isArray(skillsArray)) {
                heroSkills = skillsArray.map(skill => ({
                    name: skill.skill_name || "",
                    type: skill.skill_type || "",
                    icon: skill.skill_icon_url || "",
                    position: skill.skill_position || 0
                })).sort((a, b) => a.position - b.position);
            }
            // normalisasi data counter hero
            const countersRaw = raw.countersRaw || {};
            let strongAgainst = countersRaw.strong_against || [];
            let weakAgainst = countersRaw.counters || [];
            const formatCounter = (hero, isAdvantage) => {
                const name = hero.target_hero_name.replace(/(Decisive|Strong|Slight)/g, '').trim();
                const advantage = parseFloat(hero.win_rate_advantage || 0);
                const winRate = isAdvantage ? (50 + advantage) : (50 - advantage);
                return { name, winRate: winRate.toFixed(1) };
            };
            const heroCounters = {
                strong: strongAgainst.map(h => formatCounter(h, true)).sort((a, b) => b.winRate - a.winRate).slice(0, 3),
                weak: weakAgainst.map(h => formatCounter(h, false)).sort((a, b) => a.winRate - b.winRate).slice(0, 3)
            };

            // normalisasi statistik hero
            const statsRaw = raw.statsRaw || {};
            const statsDataBackend = (statsRaw.data && statsRaw.data.stats) ? statsRaw.data.stats : (statsRaw.stats || {});
            const stats = {
                // Konversi string "59.5000" menjadi angka "59.50"
                winRate: parseFloat(statsDataBackend.win_rate || 0).toFixed(2),
                pickRate: parseFloat(statsDataBackend.pick_rate || 0).toFixed(2),
                banRate: parseFloat(statsDataBackend.ban_rate || 0).toFixed(2)
            };

            return {
                heroName: detailData.hero_name || "Hero",
                bannerUrl: detailData.hero_url || "",
                build: {
                    hasBuild: hasBuild,
                    items: items.map(item => ({
                        position: item.position,
                        name: item.item_name,
                        icon: item.item_url || "" 
                    })),
                    emblem: {
                        name: cleanEmblemName,
                        talents: buildData.talents ? buildData.talents.map(t => t.talent_name) : []
                    },
                    spell: {
                        name: cleanSpellName
                    }
                },
                skills: heroSkills,
                counters: heroCounters,
                stats: stats,
                situational: situationalSwaps
            };
        }

        // 5. Fungsi Main Render (Memanggil Masing-masing Sub-Render Tanpa Early Return)
        function render(data) {
            console.log("RADAR 4: Masuk ke fungsi render utama. Isi data:", data);
            if (dummyNote) dummyNote.style.display = "none";
            if (!data){
                console.log("RADAR 5: Data kosong, render dihentikan.");
                return;
            } 
            renderCounters(data.counters);
            renderBanner(data);
            renderBuild(data.build);
            renderSkills(data.skills);
            renderStats(data.stats);
            renderSituational(data.situational);
            console.log("RADAR: SEMUA RENDER SELESAI DENGAN AMAN!");
        }

        // Sub-Render: Banner Hero
        function renderBanner(data) {
            if (!bannerImg) return;
            const assetBase = container.dataset.assetBase || '';
            const fallbackBanner = `${assetBase}/assets/img/default-banner.png`;

            if (data.bannerUrl) {
                bannerImg.src = data.bannerUrl;
                bannerImg.alt = data.heroName;
                bannerImg.onerror = function() {
                    this.onerror = null;
                    this.src = fallbackBanner;
                };
            } else {
                bannerImg.src = fallbackBanner;
            }
        }

        // Sub-Render: Build Items, Emblem, dan Spell
        function renderBuild(build) {
            if (!build) return;

            if (!build.hasBuild) {
                setSectionState("build", "empty");
                if (buildItemsContainer) {
                    buildItemsContainer.innerHTML = `<div class="text-center w-100 py-3">Belum ada data build</div>`;
                }
            } else {
                setSectionState("build", "ready");

                // Render 6 Items
                if (buildItemsContainer) {
                    let itemsHtml = "";
                    const assetBase = container.dataset.assetBase || '';

                    for (let i = 1; i <= 6; i++) {
                        const item = build.items.find(x => x.position === i);
                        if (item) {
                            const imgSrc = item.icon ? item.icon : `${assetBase}/assets/img/default-item.png`; 
                            itemsHtml += `
                                <li class="hd-item">
                                    <div class="hd-item__media">
                                        <span class="hd-item__slot">${i}</span>
                                        <img src="${imgSrc}" alt="${item.name}" title="${item.name}" class="hd-item__image" onerror="this.src='${assetBase}/assets/img/default-item.png'" loading="lazy" />
                                    </div>
                                    <span class="hd-item__name">${item.name}</span>
                                </li>
                            `;
                        } else {
                            itemsHtml += `
                                <li class="hd-item">
                                    <div class="hd-item__media">
                                        <span class="hd-item__slot">${i}</span>
                                        <div class="hd-item__image"></div>
                                    </div>
                                    <span class="hd-item__name">-</span>
                                </li>
                            `;
                        }
                    }
                    buildItemsContainer.innerHTML = itemsHtml;
                }
            }

            // Render Emblem
            if (emblemContainer) {
                const emblemName = build.emblem?.name || "No Emblem";
                const talents = build.emblem?.talents || [];

                let talentsHtml = talents.map(t => `
                    <li class="hd-talent" title="${t}">
                        <div class="hd-avatar">${t ? t.charAt(0) : '?'}</div>
                    </li>
                `).join("");

                emblemContainer.innerHTML = `
                    <div class="hd-setup hd-setup--emblem">
                        <div class="hd-avatar hd-setup__icon">${emblemName.charAt(0)}</div>
                        <div class="hd-setup__text">
                            <p class="hd-setup__label">EMBLEM SETUP</p>
                            <p class="hd-setup__name">${emblemName}</p>
                        </div>
                        <ul class="hd-talents">${talentsHtml}</ul>
                    </div>
                `;
            }

            // Render Battle Spell
            if (spellContainer) {
                const spellName = build.spell?.name || "No Spell";
                spellContainer.innerHTML = `
                    <div class="hd-setup hd-setup--spell">
                        <div class="hd-avatar hd-setup__icon">${spellName.charAt(0)}</div>
                        <div class="hd-setup__text">
                            <p class="hd-setup__label">BATTLE SPELL</p>
                            <p class="hd-setup__name">${spellName}</p>
                        </div>
                    </div>
                `;
            }
        }

        // Sub-Render: Skill Hero
        function renderSkills(skills) {
            if (!skillContainer) return;
            if (!skills || skills.length === 0) {
                skillContainer.innerHTML = `<li class="text-center w-100 py-2">Data skill tidak tersedia</li>`;
                return;
            }

            const SKILL_LABELS = { "Passive": "Pasif", "Skill 1": "Skill 1", "Skill 2": "Skill 2", "Ultimate": "Ultimate" };
            const assetBase = container.dataset.assetBase || '';

            let skillsHtml = skills.map(skill => {
                const imgSrc = skill.icon ? skill.icon : `${assetBase}/assets/img/default-skill.png`;
                const label = SKILL_LABELS[skill.type] || skill.type;

                return `
                    <li class="hd-skill">
                        <img src="${imgSrc}" alt="${skill.name}" title="${skill.name}" class="hd-skill__media" onerror="this.src='${assetBase}/assets/img/default-skill.png'" loading="lazy">
                        <span class="hd-skill__label">${label}</span>
                    </li>
                `;
            }).join("");

            skillContainer.innerHTML = skillsHtml;
        }

        // Sub-Render: Hero Counter
        function renderCounters(counterData) {
            console.log("CEK 1: Data masuk ke renderCounters?", counterData);

            const section = document.querySelector('[data-hd-section="counters"]');
            console.log("CEK 2: Apakah elemen section ketemu?", section);
            const favorableList = document.getElementById("hd-counter-favorable");
            const unfavorableList = document.getElementById("hd-counter-unfavorable");
            const stateSlot = section ? section.querySelector('.hd-state-slot') : null;
            const panels = section ? section.querySelectorAll('.hd-counter') : [];

            if (!section) return;

            // --- BDD Skenario 2: Data Belum Cukup ---
            if (!counterData || (counterData.strong.length === 0 && counterData.weak.length === 0)) {
                setSectionState("counters", "empty");
                panels.forEach(panel => panel.style.display = 'none');
                
                if (stateSlot) {
                    stateSlot.innerHTML = `<div class="text-center py-4 text-muted" style="font-size: 13px;">Data belum cukup untuk rekomendasi counter</div>`;
                    stateSlot.hidden = false;
                }
                return;
            }

            // --- BDD Skenario 1: Tampilkan Daftar Terurut ---
            setSectionState("counters", "ready");
            panels.forEach(panel => panel.style.display = '');
            if (stateSlot) stateSlot.hidden = true;

            // Fungsi pembantu untuk membuat tag <li class="hd-counter-row">
            function buildList(heroes, isAdvantage) {
                if (heroes.length === 0) {
                    // grid-column: 1 / -1 memastikan teks kosong memakan seluruh lebar 4 kolom
                    return `<li class="text-center py-2 text-muted" style="font-size: 12px; grid-column: 1 / -1;">Belum ada data</li>`;
                }
                
                const barColor = isAdvantage ? 'var(--hd-blue, #0d6efd)' : 'var(--hd-orange, #fd7e14)';

                return heroes.map(h => `
                    <li class="hd-counter-row">
                        <!-- Kolom 1: Avatar Inisial -->
                        <div class="hd-avatar">${h.name.charAt(0)}</div>
                        
                        <!-- Kolom 2: Nama Hero -->
                        <span class="hd-counter-row__name" title="${h.name}">${h.name}</span>
                        
                        <!-- Kolom 3: Progress Bar -->
                        <div style="height: 6px; width: 100%; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${h.winRate}%; height: 100%; background: ${barColor};"></div>
                        </div>
                        
                        <!-- Kolom 4: Nilai Persentase -->
                        <span class="hd-counter-row__value" style="color: ${barColor};">${h.winRate}%</span>
                    </li>
                `).join("");
            }

            // Suntikkan data ke masing-masing ID list
            if (favorableList) favorableList.innerHTML = buildList(counterData.strong, true);
            if (unfavorableList) unfavorableList.innerHTML = buildList(counterData.weak, false);
        }

        // Sub-Render: Statistik Hero
        function renderStats(statsData) {
            const section = document.querySelector('[data-hd-section="stats"]');
            const statsContainer = document.getElementById("hd-stats");
            const stateSlot = section ? section.querySelector('.hd-state-slot') : null;

            if (!section || !statsContainer) return;

            // --- BDD Skenario: Data Kosong ---
            if (!statsData || (statsData.winRate == 0 && statsData.pickRate == 0 && statsData.banRate == 0)) {
                setSectionState("stats", "empty");
                statsContainer.style.display = 'none';
                
                if (stateSlot) {
                    stateSlot.innerHTML = `<div class="text-center py-4 text-muted" style="font-size: 13px;">Data statistik belum tersedia</div>`;
                    stateSlot.hidden = false;
                }
                return;
            }

            // --- BDD Skenario: Data Tersedia ---
            setSectionState("stats", "ready");
            statsContainer.style.display = '';
            if (stateSlot) stateSlot.hidden = true;

            // Fungsi pembantu pembuat tag <li> dengan class BEM
            const buildStatRow = (label, value, toneClass) => `
                <li class="hd-stat">
                    <span class="hd-stat__label">${label}</span>
                    
                    <div class="hd-bar">
                        <!-- Class tone disematkan di sini agar background warna menyesuaikan CSS -->
                        <span class="hd-bar__fill ${toneClass}" style="width: ${value}%;"></span>
                    </div>
                    
                    <!-- Class tone disematkan di sini untuk mengubah warna teks persentase -->
                    <span class="hd-stat__value ${toneClass}">${value}%</span>
                </li>
            `;

            // Suntikkan 3 baris statistik sesuai warna desain (Biru, Merah, Oranye)
            statsContainer.innerHTML = 
                buildStatRow("Win Rate", statsData.winRate, "hd-tone--blue") + 
                buildStatRow("Pick Rate", statsData.pickRate, "hd-tone--red") + 
                buildStatRow("Ban Rate", statsData.banRate, "hd-tone--orange");
        }

        // Sub-Render: Aturan Item Situasional
        function renderSituational(situationalItems) {
            console.log("RADAR SITUASIONAL 2: Masuk ke renderSituational. Isi data:", situationalItems);
            const section = document.querySelector('[data-hd-section="situational"]');
            const listContainer = document.getElementById('hd-sit-list');
            const stateSlot = section ? section.querySelector('.hd-situational__result-group .hd-state-slot') : null;
            let filterButtons = document.querySelectorAll('.hd-sit-filter');

            if (!section || !listContainer || !stateSlot) return;

            function updateList(filterValue) {
                // Petakan filter UI ke condition_text backend
                let conditionTarget = "";
                if (filterValue === 'magic') conditionTarget = 'VS MAGIC';
                else if (filterValue === 'physical') conditionTarget = 'VS PHYSICAL';
                else if (filterValue === 'cc') conditionTarget = 'VS CC';
                else if (filterValue === 'healing') conditionTarget = 'VS HEALING';

                // Filter data berdasarkan kondisi
                const filtered = situationalItems.filter(item => item.condition_text === conditionTarget);

                // Skenario BDD: Belum ada aturan (Negatif)
                if (filtered.length === 0) {
                    listContainer.style.display = 'none';
                    stateSlot.innerHTML = `<div class="text-center py-4 text-muted" style="font-size: 13px;">Belum ada rekomendasi untuk kondisi ini</div>`;
                    stateSlot.hidden = false;
                    return;
                }

                // Skenario BDD: Rekomendasi tampil
                listContainer.style.display = 'grid';
                stateSlot.hidden = true;

                const assetBase = container.dataset.assetBase || '';
                
                listContainer.innerHTML = filtered.map(item => {
                    const defaultIcon = `${assetBase}/assets/img/default-item.png`;
                    const winRateShare = parseFloat(item.share_percent).toFixed(1);
                    
                    return `
                    <div class="hd-sit-card">
                        <img src="${defaultIcon}" alt="${item.item_name}" class="hd-sit-card__icon" onerror="this.onerror=null;">
                        <div class="hd-sit-card__content">
                            <h3 class="hd-sit-card__title">${item.item_name}</h3>
                            <p class="hd-sit-card__category">Item Build</p>
                            <span class="hd-sit-card__badge">Cocok</span>
                        </div>
                        <div class="hd-sit-card__reason-box">
                            <span class="hd-sit-card__reason-label">ALASAN</span>
                            <p class="hd-sit-card__reason">Sering digunakan (${winRateShare}%) saat menghadapi komposisi hero ${filterValue}.</p>
                        </div>
                    </div>
                    `;
                }).join('');
            }

            // Bersihkan dan pasang ulang event listener agar tidak duplikat saat re-render
            filterButtons.forEach(btn => btn.replaceWith(btn.cloneNode(true)));
            filterButtons = document.querySelectorAll('.hd-sit-filter');
            
            filterButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    filterButtons.forEach(b => b.classList.remove('is-active'));
                    this.classList.add('is-active');
                    updateList(this.dataset.filter);
                });
            });

            // Eksekusi otomatis saat halaman pertama kali dimuat
            const defaultActive = document.querySelector('.hd-sit-filter.is-active') || filterButtons[0];
            if (defaultActive) {
                defaultActive.classList.add('is-active');
                updateList(defaultActive.dataset.filter);
            }
        }

        function setSectionState(sectionName, state) {
            const section = document.querySelector(`[data-hd-section="${sectionName}"]`);
            if (section) section.dataset.state = state;
        }

        return { init, render, normalizeHeroDetail };
    })();

    HeroDetail.init();
});