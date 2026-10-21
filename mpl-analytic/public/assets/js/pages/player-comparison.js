
/* ========================================
   PLAYER COMPARISON - JAVASCRIPT
======================================== */

// 1. Data contoh pemain
const players = {
    kairi: {
        name: 'Kairi',
        team: 'ONIC Esports',
        role: 'Jungler',
        hero: 'Lancelot',
        image: 'assets/images/heroes/lancelot.png'
    },

    albertt: {
        name: 'Albertt',
        team: 'ONIC Esports',
        role: 'Jungler',
        hero: 'Ling',
        image: 'assets/images/heroes/ling.png'
    }
};

// 2. Ambil elemen HTML
const playerASelect = document.getElementById('player-a');
const playerBSelect = document.getElementById('player-b');

const playerACard = document.getElementById('player-card-a');
const playerBCard = document.getElementById('player-card-b');

const message = document.getElementById('pc-message');

// 3. Perbarui isi kartu pemain
function updatePlayerCard(card, player) {
    const heading = card.querySelector('h3');
    const paragraphs = card.querySelectorAll('p');

    heading.textContent = player.name;
    const heroImage = card.querySelector('.pc-player__hero');

    heroImage.src = player.image;
    heroImage.alt = `Hero ${player.hero}`;
    
    paragraphs[0].textContent = player.team;
    paragraphs[1].textContent = `Role: ${player.role}`;
    paragraphs[2].textContent = `Hero: ${player.hero}`;
}

// 4. Validasi dan perbarui perbandingan
function updateComparison() {
    const playerAId = playerASelect.value;
    const playerBId = playerBSelect.value;

    // Reset pesan sebelumnya
    message.textContent = '';

    // Pastikan kedua pemain sudah dipilih
    if (!playerAId || !playerBId) {
        message.textContent = 'Silakan pilih kedua pemain.';
        return;
    }

    // Cegah pemain yang sama dibandingkan
    if (playerAId === playerBId) {
        message.textContent =
            'Pilih dua pemain yang berbeda.';

        return;
    }

    // Ambil data berdasarkan pilihan
    const playerA = players[playerAId];
    const playerB = players[playerBId];

    // Pastikan data tersedia
    if (!playerA || !playerB) {
        message.textContent =
            'Data pemain tidak ditemukan.';

        return;
    }

    // Tampilkan data pemain
    updatePlayerCard(playerACard, playerA);
    updatePlayerCard(playerBCard, playerB);
}

// 5. Dengarkan perubahan pilihan
playerASelect.addEventListener('change', updateComparison);
playerBSelect.addEventListener('change', updateComparison);

// 6. Jalankan saat halaman pertama kali dibuka
updateComparison();
