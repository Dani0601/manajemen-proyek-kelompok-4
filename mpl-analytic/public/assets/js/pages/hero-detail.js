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
            console.log("RADAR MENTAH API:", raw);
            if (!raw) return { build: { hasBuild: false }, skills: [], bannerUrl: "", heroName: "" };

            const buildData = raw.buildRaw || {};
            const detailData = raw.detail || raw.detailRaw || raw.data?.detail || raw.data || raw || {};
            console.log("RADAR DETAIL DATA BERHASIL DIAMBIL:", detailData);
            const skillsRaw = raw.skillsRaw || {};
            console.log("RADAR DETAIL DATA:", detailData);
            // 1. TANGKAP OBJEK RECOMMENDATIONS
            // Mengambil dari detailData (jika di-fetch tergabung) atau raw.data
            const recommendations = detailData.recommendations || (raw.data && raw.data.recommendations) || {};

            // 2. ITEM SITUASIONAL
            const situationalSwaps = recommendations.items || [];
            console.log("RADAR SITUASIONAL 1: Data mentah berhasil diekstrak:", situationalSwaps);
            
            const items = buildData.items || [];
            const hasBuild = items.length > 0;

            // 3. SPELL
            let cleanSpellName = "";
            let spellIconUrl = "";
            if (recommendations.spells && recommendations.spells.length > 0) {
                cleanSpellName = recommendations.spells[0].spell_name.replace("ALSO ", "").trim();
                spellIconUrl = recommendations.spells[0].spell_icon_url || recommendations.spells[0].spell_url || "";
            }

            // 4. EMBLEM & TALENT
            let cleanEmblemName = "";
            let emblemIconUrl = "";
            if (recommendations.emblems && recommendations.emblems.length > 0) {
                cleanEmblemName = recommendations.emblems[0].name;
                emblemIconUrl = recommendations.emblems[0].emblem_icon_url || recommendations.emblems[0].emblem_url || "";
            }

            const officialRatings = {
                offense: Number(detailData.offense ?? detailData.offense_rating ?? 0),
                durability: Number(detailData.durability ?? detailData.durability_rating ?? 0),
                controlEffects: Number(detailData.control_effects ?? detailData.controlEffects ?? 0),
                difficulty: Number(detailData.difficulty ?? detailData.difficulty_rating ?? 0)
            };
            
            // Ambil talents dari recommendations, bukan buildData lagi
            const emblemTalents = recommendations.talents ? recommendations.talents.map(t => ({
                name: t.talent_name,
                icon: t.talent_icon_url || t.talent_url || ""
            })) : [];
            // 5. SKILLS (Tetap sama)
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

            // 6. COUNTERS (Tetap sama)
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

            // 7. STATS (Tetap sama)
            const statsRaw = raw.statsRaw || {};
            const statsDataBackend = (statsRaw.data && statsRaw.data.stats) ? statsRaw.data.stats : (statsRaw.stats || {});
            const stats = {
                winRate: parseFloat(statsDataBackend.win_rate || 0).toFixed(2),
                pickRate: parseFloat(statsDataBackend.pick_rate || 0).toFixed(2),
                banRate: parseFloat(statsDataBackend.ban_rate || 0).toFixed(2)
            };

            // 8. RETURN DATA
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
                        icon: emblemIconUrl,
                        talents: emblemTalents // Menggunakan variabel baru
                    },
                    spell: {
                        name: cleanSpellName,
                        icon: spellIconUrl // Menggunakan variabel baru
                    }
                },
                skills: heroSkills,
                counters: heroCounters,
                stats: stats,
                ratings: officialRatings,
                situational: situationalSwaps // Menggunakan variabel baru
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
            renderRatings(data.ratings);
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
                const emblemIcon = build.emblem?.icon || "";
                const emblemNameInitial = emblemName.charAt(0).toUpperCase();
                
                const emblemIconHtml = emblemIcon 
                    ? `<img src="${emblemIcon}" alt="${emblemName}" class="hd-setup__icon" referrerpolicy="no-referrer" onerror="this.onerror=null; this.outerHTML='<div class=&quot;hd-avatar hd-setup__icon hd-avatar--dark&quot;>${emblemNameInitial}</div>';">`
                    : `<div class="hd-avatar hd-setup__icon hd-avatar--dark">${emblemNameInitial}</div>`;
                // Gunakan gambar untuk talent jika ada, jika error otomatis jadi huruf inisial
                const talentsHtml = (build.emblem?.talents || []).map(talent => {
                    const tName = typeof talent === 'string' ? talent : (talent.name || "T");
                    const tIcon = typeof talent === 'string' ? "" : talent.icon;
                    
                    if (tIcon) {
                        return `<img src="${tIcon}" alt="${tName}" class="hd-setup__icon" referrerpolicy="no-referrer" title="${tName}" onerror="this.outerHTML='<div class=&quot;hd-avatar hd-setup__icon&quot; title=&quot;${tName}&quot;>${tName.charAt(0)}</div>';">`;
                    }
                    return `<div class="hd-avatar hd-setup__icon" title="${tName}">${tName.charAt(0)}</div>`;
                }).join('');

                emblemContainer.innerHTML = `
                    <div class="hd-setup">
                        <!-- BAGIAN KIRI: Ikon Emblem Utama -->
                        <div class="hd-setup__main-icon">
                            ${emblemIconHtml} 
                        </div>
                        
                        <!-- BAGIAN KANAN: Teks dan Talent yang dikelompokkan -->
                        <div class="hd-setup__details">
                            <div class="hd-setup__text">
                                <p class="hd-setup__label">EMBLEM SETUP</p>
                                <p class="hd-setup__name">${emblemName}</p>
                            </div>
                            <div class="hd-setup__talents">
                                ${talentsHtml}
                            </div>
                        </div>
                    </div>
                `;
            }

            // --- Render Battle Spell ---
            if (spellContainer) {
                const spellName = build.spell?.name || "No Spell";
                const spellIcon = build.spell?.icon || "";

                // Anti-pecah: Jika gambar gagal dimuat, ganti dengan Div berisi huruf pertama Spell
                const iconHtml = spellIcon 
                    ? `<img src="${spellIcon}" alt="${spellName}" class="hd-setup__icon" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;hd-avatar hd-setup__icon&quot;>${spellName.charAt(0)}</div>';">`
                    : `<div class="hd-avatar hd-setup__icon">${spellName.charAt(0)}</div>`;

                spellContainer.innerHTML = `
                    <div class="hd-setup hd-setup--spell">
                        ${iconHtml}
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

        // Sub-Render: Official Ratings
        // Sub-Render: Official Ratings (Diperbarui agar lebih fleksibel)
        function renderRatings(ratings) {
            console.log("RADAR RENDER RATINGS - Data masuk:", ratings) ;
            const section = document.querySelector('[data-hd-section="ratings"]') || document.querySelector('.hd-ratings-section');
            const container = document.getElementById('hd-ratings') || document.querySelector('.hd-ratings');
            const stateSlot = section ? section.querySelector('.hd-state-slot') : null;

            if (!section || !container) {
                console.warn("Elemen untuk Official Ratings tidak ditemukan.");
                return;
            }

            // Pastikan nilai rating aman (jika kosong/null, jadikan minimal 0 atau 1 agar tetap tampil)
            const safeRatings = {
                offense: Number(ratings?.offense ?? 0),
                durability: Number(ratings?.durability ?? 0),
                controlEffects: Number(ratings?.controlEffects ?? 0),
                difficulty: Number(ratings?.difficulty ?? 0)
            };

            setSectionState("ratings", "ready");
            container.style.display = 'grid'; 
            if (stateSlot) stateSlot.hidden = true;

            const createBlocks = (value) => {
                let blocksHtml = '';
                const maxValue = 10;
                const numValue = Number(value) || 0; 
                
                for (let i = 0; i < maxValue; i++) {
                    const isFilled = i < numValue ? 'is-filled' : '';
                    blocksHtml += `<div class="hd-rating__block ${isFilled}"></div>`;
                }
                return blocksHtml;
            };

            container.innerHTML = `
                <div class="hd-rating">
                    <dt>Offense</dt>
                    <dd class="hd-rating__blocks">${createBlocks(safeRatings.offense)}</dd>
                    <dd class="hd-rating__value">${safeRatings.offense}</dd>
                </div>
                <div class="hd-rating">
                    <dt>Durability</dt>
                    <dd class="hd-rating__blocks">${createBlocks(safeRatings.durability)}</dd>
                    <dd class="hd-rating__value">${safeRatings.durability}</dd>
                </div>
                <div class="hd-rating">
                    <dt>Control Effects</dt>
                    <dd class="hd-rating__blocks">${createBlocks(safeRatings.controlEffects)}</dd>
                    <dd class="hd-rating__value">${safeRatings.controlEffects}</dd>
                </div>
                <div class="hd-rating">
                    <dt>Difficulty</dt>
                    <dd class="hd-rating__blocks">${createBlocks(safeRatings.difficulty)}</dd>
                    <dd class="hd-rating__value">${safeRatings.difficulty}</dd>
                </div>
            `;
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

       // Sub-Render: Aturan Item Situasional (Secara Jeneral / Tanpa Filter)
        function renderSituational(situationalItems) {
            console.log("RADAR SITUASIONAL: Masuk ke renderSituational (Jeneral). Isi data:", situationalItems);
            
            const section = document.querySelector('[data-hd-section="situational"]');
            const listContainer = document.getElementById('hd-situ-list');
            const noneText = document.getElementById('hd-situ-none');
            
            if (!section || !listContainer) return;

            // Jika data kosong
            if (!situationalItems || situationalItems.length === 0) {
                listContainer.innerHTML = '';
                if (noneText) noneText.hidden = false;
                return;
            }

            if (noneText) noneText.hidden = true;

            // Hapus kontainer chips filter jika sebelumnya sempat terbuat
            const existingChips = section.querySelector('.hd-chips');
            if (existingChips) {
                existingChips.remove();
            }

            const assetBase = container.dataset.assetBase || '';

            // Render langsung seluruh item secara jeneral sesuai struktur CSS .hd-rec
            listContainer.innerHTML = situationalItems.map(item => {
                const itemIcon = item.item_icon_url || item.item_url || `${assetBase}/assets/img/default-item.png`;
                const itemName = item.item_name || 'Item Situasional';
                const categoryText = item.condition_text || 'Item Defense'; // Sesuai contoh gambar
                const reasonText = item.reason || 'Rekomendasi item situasional berdasarkan kondisi pertempuran.';
                
                return `
                <li class="hd-rec">
                    <img src="${itemIcon}" alt="${itemName}" class="hd-rec__image" onerror="this.onerror=null; this.src='${assetBase}/assets/img/default-item.png'" loading="lazy">
                    <div class="hd-rec__body">
                        <div class="hd-rec__info">
                            <h4 class="hd-rec__name">${itemName}</h4>
                            <p class="hd-rec__type">${categoryText}</p>
                            <span class="hd-badge">cocok</span>
                        </div>
                        <div class="hd-rec__reason">
                            <p class="hd-rec__label">ALASAN</p>
                            <p class="hd-rec__text">${reasonText}</p>
                        </div>
                    </div>
                </li>
                `;
            }).join('');
        }

        function setSectionState(sectionName, state) {
            const section = document.querySelector(`[data-hd-section="${sectionName}"]`);
            if (section) section.dataset.state = state;
        }

        return { init, render, normalizeHeroDetail };
    })();

    HeroDetail.init();
});