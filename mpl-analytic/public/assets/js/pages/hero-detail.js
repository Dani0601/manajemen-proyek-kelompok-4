document.addEventListener("DOMContentLoaded", () => {
    const HeroDetail = (function () {
        // 1. Deklarasi Elemen Utama berdasarkan kontrak FE 1
        const container = document.getElementById("hero-detail");
        const dummyNote = document.getElementById("hd-dummy-note");
        
        const buildSection = document.querySelector('[data-hd-section="build"]');
        const buildItemsContainer = document.getElementById("hd-build-items");
        const emblemContainer = document.getElementById("hd-emblem");
        const spellContainer = document.getElementById("hd-spell");
        const skillContainer = document.getElementById("hd-skill"); // Kontainer untuk Skill Hero

        // 2. Fungsi Inisialisasi
        async function init() {
            if (!container) return;

            // Membaca ID Hero dari URL (?id=)
            const urlParams = new URLSearchParams(window.location.search);
            const heroId = urlParams.get("id") || container.getAttribute("data-hero-id");

            if (!heroId || heroId === "0") {
                setSectionState("build", "empty");
                return;
            }

            setSectionState("build", "loading");
            await fetchHeroDetail(heroId);
        }

        // 3. Mengambil Data dari api-client.js
        async function fetchHeroDetail(heroId) {
            if (!window.ApiClient || !window.ApiClient.getHeroDetail) {
                console.error("ApiClient.getHeroDetail tidak ditemukan. Pastikan api-client.js dimuat lebih dulu.");
                setSectionState("build", "error");
                return;
            }

            const rawData = await window.ApiClient.getHeroDetail(heroId);
            console.log("1. Data Mentah dari API:", rawData);
            const normalizedData = normalizeHeroDetail(rawData);
            console.log("2. Data Hasil Normalisasi:", normalizedData);
            render(normalizedData);
        }

        // 4. Normalisasi Data (Menyesuaikan dengan format JSON endpoint /skills)
        function normalizeHeroDetail(raw) {
            if (!raw || !raw.buildRaw) {
                return { build: { hasBuild: false }, skills: [] };
            }

            const buildData = raw.buildRaw;
            const detailData = raw.detailRaw || null;
            const skillsRaw = raw.skillsRaw || null;
            const items = buildData.items || [];
            const hasBuild = items.length > 0;

            let cleanSpellName = "";
            if (buildData.spells && buildData.spells.length > 0) {
                cleanSpellName = buildData.spells[0].spell_name.replace("ALSO ", "").trim();
            }

            let cleanEmblemName = "";
            if (detailData && detailData.recommendations && detailData.recommendations.emblems.length > 0) {
                cleanEmblemName = detailData.recommendations.emblems[0].name;
            }

            // Normalisasi array skills dari endpoint /heroes/{id}/skills
            let heroSkills = [];
            const skillsArray = skillsRaw && skillsRaw.skills ? skillsRaw.skills : [];
            
            if (Array.isArray(skillsArray)) {
                heroSkills = skillsArray.map(skill => ({
                    name: skill.skill_name || "",
                    type: skill.skill_type || "", // Contoh: "Passive", "Skill 1", "Skill 2", "Ultimate"
                    icon: skill.skill_icon_url || "",
                    position: skill.skill_position || 0
                })).sort((a, b) => a.position - b.position); // Urutkan berdasarkan posisi (1, 2, 3, 4)
            }

            return {
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
                skills: heroSkills
            };
        }

        // 5. Fungsi Render Tampilan
        function render(data) {
            // Sembunyikan catatan dummy jika data berhasil dirender
            if (dummyNote) dummyNote.style.display = "none";

            if (!data.build.hasBuild) {
                setSectionState("build", "empty");
                if (buildItemsContainer) {
                    buildItemsContainer.innerHTML = `<div class="text-center w-100 py-3">Belum ada data build</div>`;
                }
                return;
            }

            setSectionState("build", "ready");

            // Render 6 Slot Item secara berurutan
            if (buildItemsContainer) {
                let itemsHtml = "";
                for (let i = 1; i <= 6; i++) {
                    const item = data.build.items.find(x => x.position === i);
                    if (item) {
                        const imgSrc = item.icon ? item.icon : '/assets/img/default-item.png'; 
                        itemsHtml += `
                            <li class="hd-items item-slot">
                                <img src="${imgSrc}" alt="${item.name}" title="${item.name}" style="width: 100%; max-width: 50px; border-radius: 50%;" />
                            </li>
                        `;
                    } else {
                        itemsHtml += `<li class="hd-items item-slot empty-slot" style="width: 50px; height: 50px; background: #e9ecef; border-radius: 50%;"></li>`;
                    }
                }
                buildItemsContainer.innerHTML = itemsHtml;
            }

            // Render Emblem & Talent
            if (emblemContainer) {
                let talentsHtml = data.build.emblem.talents.map(t => `<span class="badge bg-secondary me-1">${t}</span>`).join("");
                emblemContainer.innerHTML = `
                    <div class="hd-setup d-flex flex-column">
                        <strong>${data.build.emblem.name}</strong>
                        <div class="mt-1">${talentsHtml}</div>
                    </div>
                `;
            }

            // Render Battle Spell
            if (spellContainer) {
                spellContainer.innerHTML = `
                    <div class="hd-setup">
                        <strong>${data.build.spell.name}</strong>
                    </div>
                `;
            }

            // Render Skill Hero (Pasif, Skill 1, Skill 2, Ultimate)
            if (skillContainer && data.skills && data.skills.length > 0) {
                let skillsHtml = `<div class="d-flex justify-content-around align-items-center w-100 py-2">`;
                
                data.skills.forEach(skill => {
                    const imgSrc = skill.icon ? skill.icon : '/assets/img/default-skill.png';
                    skillsHtml += `
                        <div class="d-flex flex-column align-items-center text-center">
                            <img src="${imgSrc}" alt="${skill.name}" title="${skill.name}" 
                                 style="width: 55px; height: 55px; border-radius: 12px; object-fit: cover; box-shadow: 0 4px 6px rgba(0,0,0,0.2);" />
                            <span class="mt-2 text-dark" style="font-size: 12px; font-weight: 600;">${skill.type || skill.name}</span>
                        </div>
                    `;
                });
                
                skillsHtml += `</div>`;
                skillContainer.innerHTML = skillsHtml;
            }
        }

        // 6. Helper untuk mengatur State (Loading, Empty, Ready, Error)
        function setSectionState(sectionName, state) {
            const section = document.querySelector(`[data-hd-section="${sectionName}"]`);
            if (!section) return;
            section.dataset.state = state;
        }

        return {
            init,
            render,
            normalizeHeroDetail
        };
    })();

    HeroDetail.init();
});