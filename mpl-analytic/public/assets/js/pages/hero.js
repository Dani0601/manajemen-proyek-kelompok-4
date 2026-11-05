(function () {
    'use strict';

    // Pastikan elemen utama ada di halaman
    const root = document.getElementById('hero-list');
    if (!root) return;

    // Ambil elemen-elemen DOM yang dibutuhkan
    const grid = document.getElementById('hl-grid');
    const state = document.getElementById('hl-state');
    const searchInput = document.getElementById('hl-search');
    const roleSelect = document.getElementById('hl-role');

    // Ambil variabel dari data attribute yang sudah Anda siapkan di HTML
    const detailUrlBase = root.dataset.detailUrl || '';

    // Fungsi utilitas untuk mencegah XSS (Cross-Site Scripting)
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

    // Fungsi utama untuk mengambil dan merender hero
    async function loadHeroes() {
        const query = searchInput.value;
        const role = roleSelect.value;

        // Tampilkan state loading dan kosongkan grid
        grid.innerHTML = '';
        state.hidden = false;
        state.textContent = 'Memuat hero...';

        try {
            // Panggil API Client
            const heroes = await window.ApiClient.getHeroes(query, role);

            // Jika hasil pencarian kosong
            if (!heroes || heroes.length === 0) {
                state.textContent = 'Hero tidak ditemukan.';
                return;
            }

            // Sembunyikan state text, lalu render kartu hero
            state.hidden = true;
            grid.innerHTML = heroes.map(hero => {
                // Link menuju detail hero (misal: /hero-detail?id=259)
                const heroLink = `${detailUrlBase}?id=${esc(hero.hero_id)}`;
                const inisial = esc(hero.hero_name).charAt(0).toUpperCase();
                
                return `
                    <li>
                        <a href="${heroLink}" class="hl-card" aria-label="${esc(hero.hero_name)}">
                            <img class="hl-card__img" src="${esc(hero.hero_url)}" alt="${esc(hero.hero_name)}" loading="lazy" 
                                 onerror="this.outerHTML='<div class=\\'hl-card__img hl-card__img--fb\\'>${inisial}</div>'">
                            <span class="hl-card__name">${esc(hero.hero_name)}</span>
                            <span class="hl-card__role">${esc(hero.role)}</span>
                        </a>
                    </li>
                `;
            }).join('');

        } catch (error) {
            console.error('Gagal memuat hero:', error);
            state.textContent = 'Gagal memuat daftar hero. Silakan muat ulang halaman.';
        }
    }

    // --- EVENT LISTENERS ---

    // 1. Event untuk Dropdown Role (langsung panggil API saat diubah)
    roleSelect.addEventListener('change', loadHeroes);

    // 2. Event untuk Kotak Pencarian (menggunakan Debounce agar tidak spam API tiap huruf diketik)
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadHeroes, 300); // Tunggu 300ms setelah berhenti mengetik
    });

    // 3. Render awal saat halaman pertama kali dimuat
    if (window.ApiClient) {
        loadHeroes();
    } else {
        state.textContent = 'Sistem API tidak ditemukan (api-client.js belum dimuat).';
    }

})();