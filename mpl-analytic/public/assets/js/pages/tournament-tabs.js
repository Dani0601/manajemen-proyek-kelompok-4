(function () {
    var titles = {
        jadwal: 'Jadwal Pertandingan',
        hasil: 'Hasil Pertandingan',
        klasemen: 'Klasemen',
        tim: 'Daftar Tim' // Tambahkan ini agar tab 'tim' Anda terbaca
    };

    function apply() {
        var h = (location.hash || '#jadwal').replace('#', '');
        console.log("Tab aktif saat ini:", h);
        // 1. ganti judul h1
        var t = document.getElementById('tr-head-title');
        if (t && titles[h]) t.textContent = titles[h];

        // 2. tampilkan panel yang sesuai (tambahkan 'tim' di sini)
        ['jadwal', 'hasil', 'klasemen', 'tim'].forEach(function (n) {
            var p = document.getElementById('tr-panel-' + n);
            if (p) p.hidden = (n !== h);
        });
        
        if (h === 'jadwal' && window.TournamentSchedule) {
            window.TournamentSchedule.init();
        }
    }

    apply();                                      
    window.addEventListener('hashchange', apply); 
})();