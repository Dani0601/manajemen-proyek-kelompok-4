document.addEventListener("DOMContentLoaded", () => {
    const HeroDetail = (function () {
        // 1. Deklarasi Elemen Utama berdasarkan kontrak FE 1
        const container = document.getElementById("hero-detail");
        const dummyNote = document.getElementById("hd-dummy-note");
        
        const buildSection = document.querySelector('[data-hd-section="build"]');
        const buildItemsContainer = document.getElementById("hd-build-items");
        const emblemContainer = document.getElementById("hd-emblem");
        const spellContainer = document.getElementById("hd-spell");

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

        // 4. Normalisasi Data (Menyesuaikan dengan format yang dibutuhkan render)
        function normalizeHeroDetail(raw) {
            if (!raw || !raw.buildRaw) {
                return { build: { hasBuild: false } };
            }

            const buildData = raw.buildRaw;
            const detailData = raw.detailRaw || null;
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
                }
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
                        const imgSrc = item.icon ? item.icon : '/assets/img/default-item.png'; // Ganti path sesuai aset default proyek Anda
                        itemsHtml += `
                            <li class="hd-items item-slot">
                                <img src="${imgSrc}" alt="${item.name}" title="${item.name}" style="width: 100%; max-width: 50px; border-radius: 50%;" />
                            </li>
                        `;
                    } else {
                        // Merender slot kosong jika item kurang dari 6
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
        }

        // 6. Helper untuk mengatur State (Loading, Empty, Ready, Error)
        function setSectionState(sectionName, state) {
            const section = document.querySelector(`[data-hd-section="${sectionName}"]`);
            if (!section) return;

            // FE 1 biasanya memiliki class atau logika spesifik untuk .hd-state-slot
            // Di sini kita mensimulasikan perubahan state melalui atribut dataset
            section.dataset.state = state;
            
            // Catatan: Jika tampilan state belum berubah secara visual, 
            // Anda bisa berkoordinasi dengan FE 1 mengenai class CSS apa yang mengatur `.hd-state-slot`
        }

        // Mengekspos fungsi yang bisa dipanggil dari luar (jika diperlukan)
        return {
            init,
            render,
            normalizeHeroDetail
        };
    })();

    // Jalankan skrip saat halaman selesai dimuat
    HeroDetail.init();
});