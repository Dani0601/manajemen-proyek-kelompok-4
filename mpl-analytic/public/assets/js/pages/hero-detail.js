document.addEventListener("DOMContentLoaded", () => {
    const HeroDetail = (function () {
        // ==========================================
        // 1. DEKLARASI ELEMEN UTAMA
        // ==========================================
        const container = document.getElementById("hero-detail");
        const dummyNote = document.getElementById("hd-dummy-note");
        const counterContainer = document.getElementById("hd-counters");
        const buildItemsContainer = document.getElementById("hd-build-items");
        const emblemContainer = document.getElementById("hd-emblem");
        const spellContainer = document.getElementById("hd-spell");
        const skillContainer = document.getElementById("hd-skills");
        const bannerImg = document.getElementById("hd-banner-img");

        // ==========================================
        // 2. INISIALISASI
        // ==========================================
        async function init() {
            if (!container) return;

            const urlParams = new URLSearchParams(window.location.search);
            const heroId = urlParams.get("id") || container.getAttribute("data-hero-id");

            if (!heroId || heroId === "0") {
                setSectionState("build", "empty");
                return;
            }

            SECTIONS.forEach(n => showState(n, "loading"));
            await fetchHeroDetail(heroId);
        }

        // ==========================================
        // 3. API FETCH (Sangat Sederhana karena diurus api-client.js)
        // ==========================================
        async function fetchHeroDetail(heroId) {
            if (!window.ApiClient || !window.ApiClient.getHeroDetail) {
                console.error("ApiClient.getHeroDetail tidak ditemukan.");
                showAllError(heroId);
                return;
            }

            try {
                // Panggil fungsi getHeroDetail dari api-client.js yang membungkus 5 endpoint
                const rawData = await window.ApiClient.getHeroDetail(heroId);
                
                if (!rawData) throw new Error("Data API kosong");

                const normalizedData = normalizeHeroDetail(rawData);
                
                render(normalizedData);
                applySimulation();
            } catch (error) {
                console.error("Terjadi kesalahan saat fetch API:", error);
                showAllError(heroId);
            }
        }

        // ==========================================
        // 4. NORMALISASI DATA
        // ==========================================
        function normalizeHeroDetail(raw) {
            if (!raw) return { build: { hasBuild: false }, skills: [], bannerUrl: "", heroName: "" };

            // 1. PISAHKAN SUMBER DATA SESUAI HASIL DARI api-client.js
            const detailData = raw.detailRaw?.data || raw.detailRaw || {};
            const buildData = raw.buildRaw?.data || raw.buildRaw || {}; // Khusus Item Situasional
            const skillsData = raw.skillsRaw?.data || raw.skillsRaw || {};
            const countersData = raw.countersRaw?.data || raw.countersRaw || {};
            const statsData = raw.statsRaw?.data || raw.statsRaw || {};

            // 2. TANGKAP RECOMMENDATIONS (HANYA DARI ENDPOINT DETAIL)
            const recommendations = detailData.recommendations || {};

            // A. DATA DETAIL (Banner & Nama)
            const heroName = detailData.hero_name || detailData.name || "Hero";
            const bannerUrl = detailData.hero_url || detailData.bannerUrl || "";

            // B. DATA BUILD UTAMA (Item 6 Slot, Emblem, Spell - SEMUANYA DARI DETAIL)
            let items = [];
            if (Array.isArray(buildData)) {
                items = buildData;
            } else {
                items = buildData.items || [];
            }
            const hasBuild = items.length > 0;

            const spellsRaw = recommendations.spells || detailData.spells || [];
            let cleanSpellName = "";
            let spellIconUrl = "";
            if (spellsRaw.length > 0) {
                cleanSpellName = (spellsRaw[0].spell_name || "").replace("ALSO ", "").trim();
                spellIconUrl = spellsRaw[0].spell_icon_url || spellsRaw[0].spell_url || "";
            }

            const emblemsRaw = recommendations.emblems || detailData.emblems || [];
            let cleanEmblemName = "";
            let emblemIconUrl = "";
            let emblemTalents = [];
            if (emblemsRaw.length > 0) {
                cleanEmblemName = emblemsRaw[0].name || emblemsRaw[0].emblem_name || "";
                emblemIconUrl = emblemsRaw[0].emblem_icon_url || emblemsRaw[0].emblem_url || "";
            }
            
            const talentsRaw = recommendations.talents || detailData.talents || [];
            if (talentsRaw.length > 0) {
                emblemTalents = talentsRaw.map(t => ({
                    name: t.talent_name || t.name,
                    icon: t.talent_icon_url || t.talent_url || t.icon || ""
                }));
            }

            // C. ITEM SITUASIONAL: ikon dari /builds, alasan dari /heroes/{id}
            const swapsFromBuild = buildData.situational_swaps || [];
            const recItems = recommendations.items || [];

            const reasonByCondition = {};
            recItems.forEach((r) => {
            reasonByCondition[(r.condition_text || "").trim().toUpperCase()] = r.reason;
            });

            const situationalSwaps = swapsFromBuild.length
            ? swapsFromBuild.map((swap) => ({
                ...swap,
                reason: reasonByCondition[(swap.condition_text || "").trim().toUpperCase()] || ""
                }))
            : recItems;
            
            // D. RATINGS (DARI DETAIL)
            function findValue(obj, keys) {
                if (!obj || typeof obj !== 'object') return null;
                for (let key of keys) {
                    if (key in obj && obj[key] !== null && obj[key] !== "") return obj[key];
                }
                for (let k in obj) {
                    const result = findValue(obj[k], keys);
                    if (result !== null) return result;
                }
                return null;
            }
            
            const officialRatings = {
                offense: Number(findValue(detailData, ['offense', 'offense_rating'])) || 0,
                durability: Number(findValue(detailData, ['durability', 'durability_rating'])) || 0,
                controlEffects: Number(findValue(detailData, ['control_effects', 'controlEffects', 'control_effect'])) || 0,
                difficulty: Number(findValue(detailData, ['difficulty', 'difficulty_rating'])) || 0
            };

            // E. SKILLS (DARI SKILLS RAW ATAU DETAIL)
            let heroSkills = [];
            const skillsArray = Array.isArray(skillsData) ? skillsData : (skillsData.skills || detailData.skills || []);
            if (Array.isArray(skillsArray)) {
                heroSkills = skillsArray.map(skill => ({
                    name: skill.skill_name || "",
                    type: skill.skill_type || "",
                    icon: skill.skill_icon_url || skill.skill_url || "",
                    position: skill.skill_position || 0
                })).sort((a, b) => a.position - b.position);
            }

            // F. COUNTERS (DARI COUNTERS RAW)
            let strongAgainst = countersData.strong_against || (Array.isArray(countersData) ? countersData.filter(c => c.relation_type === 'strong') : []);
            let weakAgainst = countersData.counters || (Array.isArray(countersData) ? countersData.filter(c => c.relation_type === 'counter' || c.relation_type === 'weak') : []);
            
            const formatCounter = (hero, isAdvantage) => {
                const name = hero.target_hero_name ? hero.target_hero_name.replace(/(Decisive|Strong|Slight)/g, '').trim() : "Unknown";
                const advantage = parseFloat(hero.win_rate_advantage || 0);
                const winRate = isAdvantage ? (50 + advantage) : (50 - advantage);
                const icon = hero.target_hero_icon_url || hero.target_hero_url || "";
                return { name, winRate: winRate.toFixed(1), icon };
            };
            
            const heroCounters = {
                strong: strongAgainst.map(h => formatCounter(h, true)).sort((a, b) => b.winRate - a.winRate).slice(0, 3),
                weak: weakAgainst.map(h => formatCounter(h, false)).sort((a, b) => a.winRate - b.winRate).slice(0, 3)
            };

            // G. STATS (DARI STATS RAW ATAU DETAIL)
            const statsSource = statsData.stats || statsData || detailData.stats || {};
            const stats = {
                winRate: parseFloat(statsSource.win_rate || 0).toFixed(2),
                pickRate: parseFloat(statsSource.pick_rate || 0).toFixed(2),
                banRate: parseFloat(statsSource.ban_rate || 0).toFixed(2)
            };

            // RETURN DATA FINAL KE FUNGSI RENDER
            return {
                heroName: heroName,
                bannerUrl: bannerUrl,
                build: {
                    hasBuild: hasBuild,
                    items: items.map(item => ({
                        position: item.position,
                        name: item.item_name,
                        icon: item.item_icon_url || item.item_url || "" 
                    })),
                    emblem: {
                        name: cleanEmblemName,
                        icon: emblemIconUrl,
                        talents: emblemTalents
                    },
                    spell: {
                        name: cleanSpellName,
                        icon: spellIconUrl
                    }
                },
                skills: heroSkills,
                counters: heroCounters,
                stats: stats,
                ratings: officialRatings,
                situational: situationalSwaps
            };
        }

        // ==========================================
        // 5. FUNGSI MAIN RENDER
        // ==========================================
        function render(data) {
            if (dummyNote) dummyNote.style.display = "none";
            if (!data) return;
            
            renderCounters(data.counters);
            renderBanner(data);
            renderBuild(data.build);
            renderSkills(data.skills);
            renderRatings(data.ratings);
            renderStats(data.stats);
            renderSituational(data.situational);
        }

        // Sub-Render: Banner Hero
        function renderBanner(data) {
            if (!bannerImg) return;
            const assetBase = container.dataset.assetBase || '';
            const fallbackBanner = `${assetBase}/images/default-banner.png`;

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
                showState("build", "empty");
                if (emblemContainer) emblemContainer.innerHTML = "";
                if (spellContainer) spellContainer.innerHTML = "";
            } else {
                setSectionState("build", "ready");
                const assetBase = container.dataset.assetBase || '';

                // Render 6 Items
                if (buildItemsContainer) {
                    let itemsHtml = "";
                    for (let i = 1; i <= 6; i++) {
                        const item = build.items.find(x => x.position === i);
                        if (item) {
                            const imgSrc = item.icon ? item.icon : `${assetBase}/images/default-item.png`; 
                            itemsHtml += `
                                <li class="hd-item">
                                    <div class="hd-item__media">
                                        <span class="hd-item__slot">${i}</span>
                                        <img src="${imgSrc}" alt="${item.name}" title="${item.name}" class="hd-item__image" onerror="this.src='${assetBase}/images/default-item.png'" loading="lazy" />
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

            // Render Emblem (Menggunakan HTML Grid langsung sesuai CSS Figma)
            if (emblemContainer) {
                const emblemName = build.emblem?.name || "No Emblem";
                const emblemIcon = build.emblem?.icon || "";
                const emblemNameInitial = emblemName.charAt(0).toUpperCase();
                
                const emblemIconHtml = emblemIcon 
                    ? `<img src="${emblemIcon}" alt="${emblemName}" class="hd-setup__icon" referrerpolicy="no-referrer" onerror="this.onerror=null; this.outerHTML='<div class=&quot;hd-setup__icon hd-avatar hd-avatar--dark&quot;>${emblemNameInitial}</div>';">`
                    : `<div class="hd-setup__icon hd-avatar hd-avatar--dark">${emblemNameInitial}</div>`;
                
                const talentsHtml = (build.emblem?.talents || []).map(talent => {
                    const tName = typeof talent === 'string' ? talent : (talent.name || "T");
                    const tIcon = typeof talent === 'string' ? "" : talent.icon;
                    
                    if (tIcon) {
                        return `<li class="hd-talent"><img src="${tIcon}" alt="${tName}" referrerpolicy="no-referrer" title="${tName}" onerror="this.outerHTML='<div class=&quot;hd-talent hd-avatar&quot; title=&quot;${tName}&quot;>${tName.charAt(0)}</div>';"></li>`;
                    }
                    return `<li class="hd-talent"><div class="hd-avatar" title="${tName}">${tName.charAt(0)}</div></li>`;
                }).join('');

                emblemContainer.innerHTML = `
                    <div class = "hd-setup">
                        <!-- BAGIAN KIRI: Ikon Emblem Utama -->
                        ${emblemIconHtml} 
                        <!-- BAGIAN KANAN: Teks dan Talent yang dikelompokkan -->
                        <div class="hd-setup__text">
                            <p class="hd-setup__label">EMBLEM SETUP</p>
                            <p class="hd-setup__name">${emblemName}</p>
                            ${talentsHtml ? `<ul class="hd-talents">${talentsHtml}</ul>` : ''}
                        </div>
                    </div>
                `;
            }

            // Render Battle Spell
            if (spellContainer) {
                const spellName = build.spell?.name || "No Spell";
                const spellIcon = build.spell?.icon || "";

                const iconHtml = spellIcon 
                    ? `<img src="${spellIcon}" alt="${spellName}" class="hd-setup__icon" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;hd-setup__icon hd-avatar&quot;>${spellName.charAt(0)}</div>';">`
                    : `<div class="hd-setup__icon hd-avatar">${spellName.charAt(0)}</div>`;

                spellContainer.innerHTML = `
                    ${iconHtml}
                    <div class="hd-setup__text">
                        <p class="hd-setup__label">BATTLE SPELL</p>
                        <p class="hd-setup__name">${spellName}</p>
                    </div>
                `;
            }
        }

        // Sub-Render: Skill Hero
        function renderSkills(skills) {
            if (!skillContainer) return;
            if (!skills || skills.length === 0) {
                showState("skills", "empty");
                return;
            }
            clearState("skills");
            const SKILL_LABELS = { "Passive": "Pasif", "Skill 1": "Skill 1", "Skill 2": "Skill 2", "Ultimate": "Ultimate" };
            const assetBase = container.dataset.assetBase || '';

            let skillsHtml = skills.map(skill => {
                const imgSrc = skill.icon ? skill.icon : `${assetBase}/images/default-skill.png`;
                const label = SKILL_LABELS[skill.type] || skill.type;

                return `
                    <li class="hd-skill">
                        <img src="${imgSrc}" alt="${skill.name}" title="${skill.name}" class="hd-skill__media" onerror="this.src='${assetBase}/images/default-skill.png'" loading="lazy">
                        <span class="hd-skill__label">${label}</span>
                    </li>
                `;
            }).join("");

            skillContainer.innerHTML = skillsHtml;
        }

        // Sub-Render: Official Ratings
        function renderRatings(ratings) {
            const section = document.querySelector('[data-hd-section="ratings"]') || document.querySelector('.hd-ratings-section');
            const containerBox = document.getElementById('hd-ratings') || document.querySelector('.hd-ratings');
            const stateSlot = section ? section.querySelector('.hd-state-slot') : null;

            if (!section || !containerBox) return;

            const safeRatings = {
                offense: Number(ratings?.offense ?? 0),
                durability: Number(ratings?.durability ?? 0),
                controlEffects: Number(ratings?.controlEffects ?? 0),
                difficulty: Number(ratings?.difficulty ?? 0)
            };

            setSectionState("ratings", "ready");
            containerBox.style.display = 'grid'; 
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

            containerBox.innerHTML = `
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
            const section = document.querySelector('[data-hd-section="counters"]');
            const favorableList = document.getElementById("hd-counter-favorable");
            const unfavorableList = document.getElementById("hd-counter-unfavorable");
            const stateSlot = section ? section.querySelector('.hd-state-slot') : null;
            const panels = section ? section.querySelectorAll('.hd-counter') : [];

            if (!section) return;

            if (!counterData || (counterData.strong.length === 0 && counterData.weak.length === 0)) {
                showState("counters", "empty");
                return;
            }

            setSectionState("counters", "ready");
            panels.forEach(panel => panel.style.display = '');
            if (stateSlot) stateSlot.hidden = true;

            function buildList(heroes, isAdvantage) {
                if (heroes.length === 0) {
                    return `<li class="text-center py-2 text-muted" style="font-size: 12px; grid-column: 1 / -1;">Belum ada data</li>`;
                }
                
                const barColor = isAdvantage ? 'var(--hd-blue, #0d6efd)' : 'var(--hd-orange, #fd7e14)';

                return heroes.map(h => {
                    const avatarHtml = h.icon 
                        ? `<img src="${h.icon}" alt="${h.name}" class="hd-avatar" style="object-fit: cover;" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;hd-avatar&quot;>${h.name.charAt(0)}</div>'">`
                        : `<div class="hd-avatar">${h.name.charAt(0)}</div>`;

                    return `
                    <li class="hd-counter-row">
                        ${avatarHtml}
                        <span class="hd-counter-row__name" title="${h.name}">${h.name}</span>
                        <div style="height: 6px; width: 100%; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${h.winRate}%; height: 100%; background: ${barColor};"></div>
                        </div>
                        <span class="hd-counter-row__value" style="color: ${barColor};">${h.winRate}%</span>
                    </li>
                    `;
                }).join("");
            }

            if (favorableList) favorableList.innerHTML = buildList(counterData.strong, true);
            if (unfavorableList) unfavorableList.innerHTML = buildList(counterData.weak, false);
        }

        // Sub-Render: Statistik Hero
        function renderStats(statsData) {
            const section = document.querySelector('[data-hd-section="stats"]');
            const statsContainerBox = document.getElementById("hd-stats");
            const stateSlot = section ? section.querySelector('.hd-state-slot') : null;

            if (!section || !statsContainerBox) return;

            if (!statsData || (statsData.winRate == 0 && statsData.pickRate == 0 && statsData.banRate == 0)) {
                showState("stats", "empty");
                return;
            }

            setSectionState("stats", "ready");
            statsContainerBox.style.display = '';
            if (stateSlot) stateSlot.hidden = true;

            const buildStatRow = (label, value, toneClass) => `
                <li class="hd-stat">
                    <span class="hd-stat__label">${label}</span>
                    <div class="hd-bar">
                        <span class="hd-bar__fill ${toneClass}" style="width: ${value}%;"></span>
                    </div>
                    <span class="hd-stat__value ${toneClass}">${value}%</span>
                </li>
            `;

            statsContainerBox.innerHTML = 
                buildStatRow("Win Rate", statsData.winRate, "hd-tone--blue") + 
                buildStatRow("Pick Rate", statsData.pickRate, "hd-tone--red") + 
                buildStatRow("Ban Rate", statsData.banRate, "hd-tone--orange");
        }

        // Sub-Render: Item Situasional
        function renderSituational(situationalItems) {
            const section = document.querySelector('[data-hd-section="situational"]');
            const listContainer = document.getElementById('hd-situ-list');
            const noneText = document.getElementById('hd-situ-none');
            
            if (!section || !listContainer) return;

            if (!situationalItems || situationalItems.length === 0) {
                listContainer.innerHTML = '';
                showState('situational', 'empty');
                return;
            }

            setSectionState("situational", "ready");

            // Hapus filter chips jika ada
            const existingChips = section.querySelector('.hd-chips');
            if (existingChips) existingChips.remove();
            const assetBase = container.dataset.assetBase || '';
            listContainer.innerHTML = situationalItems.map(item => {
                let rawName = item.item_name || item.name || 'Item Situasional';
                rawName = rawName.replace(/^Situational:\s*/i, '');
                
                let cleanName = rawName;
                let categoryText = item.condition_text || item.condition || 'Situasional';
                
                const bracketMatch = rawName.match(/(.*?)\s*\((.*?)\)$/);
                if (bracketMatch) {
                    cleanName = bracketMatch[1].trim();     
                    categoryText = bracketMatch[2].trim();  
                }

                // Sistem Gambar dengan Inisial Fallback
                const itemIcon = item.item_icon_url || item.item_url || item.icon || item.url || "";
                const initial = cleanName.charAt(0).toUpperCase();
                
                const fallbackDiv = `<div class=&quot;hd-rec__image&quot; style=&quot;display:flex; align-items:center; justify-content:center; background:var(--hd-navy, #1e293b); color:#fff; font-size:24px; font-weight:bold; border-radius:12px;&quot;>${initial}</div>`;
                
                const mediaHtml = itemIcon 
                    ? `<img src="${itemIcon}" alt="${cleanName}" class="hd-rec__image" style="object-fit: cover;" onerror="this.onerror=null; this.outerHTML='${fallbackDiv}';">`
                    : fallbackDiv.replace(/&quot;/g, '"');

                const reasonText = item.reason || item.reason_text || 'Item situasional untuk menghadapi kondisi spesifik.';
                
                return `
                <li class="hd-rec">
                    ${mediaHtml}
                    <div class="hd-rec__body">
                        <div class="hd-rec__info">
                            <h4 class="hd-rec__name">${cleanName}</h4>
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
        // ==========================================
        // STATE SERAGAM (memakai UiState dari ui-state.js)
        // ==========================================
        const SECTIONS = ["build", "skills", "stats", "counters", "situational"];
        const EMPTY_COPY = {
            build:       { title: "Belum ada data build", text: "Build untuk hero ini belum tersedia" },
            skills:      { title: "Data skill tidak tersedia", text: "Skill hero ini belum tersedia" },
            stats:       { title: "Data statistik belum tersedia", text: "Statistik hero ini belum tersedia" },
            counters:    { title: "Data belum cukup untuk rekomendasi counter", text: "Data counter hero ini belum mencukupi" },
            situational: { title: "Belum ada rekomendasi untuk kondisi ini", text: "Aturan item situasional untuk hero ini belum tersedia" }
        };

        function showState(name, type, opts) {
            const section = document.querySelector(`[data-hd-section="${name}"]`);
            const slot = section ? section.querySelector(".hd-state-slot") : null;
            if (!slot || !window.UiState) return;
            const copy = type === "empty" ? (EMPTY_COPY[name] || {}) : {};
            UiState.render(slot, type, Object.assign({}, copy, opts));
            slot.parentElement.classList.add("is-stated");
            slot.hidden = false;
            section.dataset.state = type;
        }

        function clearState(name) {
            const section = document.querySelector(`[data-hd-section="${name}"]`);
            const slot = section ? section.querySelector(".hd-state-slot") : null;
            if (!slot) return;
            slot.parentElement.classList.remove("is-stated");
            slot.hidden = true;
            slot.replaceChildren();
            section.dataset.state = "ready";
        }

        function showAllError(heroId) {
            SECTIONS.forEach(n => showState(n, "error", {
                onRetry: () => {
                    SECTIONS.forEach(m => showState(m, "loading"));
                    fetchHeroDetail(heroId);
                }
            }));
        }

        // Simulasi (localhost saja): ?state=empty|error|loading|partial&section=build,stats
        function applySimulation() {
            const sim = window.UiState && UiState.simulate();
            if (!sim) return;
            const targets = sim.sections || (sim.state === "partial" ? ["stats", "counters", "situational"] : SECTIONS);
            const type = sim.state === "partial" ? "empty" : sim.state;
            targets.forEach(n => showState(n, type, type === "error" ? { onRetry: () => location.reload() } : {}));
        }

        // Helper: Set State UI
        function setSectionState(sectionName, state) {
            const section = document.querySelector(`[data-hd-section="${sectionName}"]`);
            if (section) section.dataset.state = state;
            if (state === "ready") clearState(sectionName);
        }

        // Buka fungsi ke luar modul
        return { init, render, normalizeHeroDetail };
    })();

    HeroDetail.init();
});