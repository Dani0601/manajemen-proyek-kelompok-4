<!DOCTYPE html>
<html lang="id">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>MLBB Guide - Dashboard</title>

    <!-- Bootstrap 5 -->
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >

    <!-- Dashboard CSS -->
    <link
        rel="stylesheet"
        href="../../public/assets/css/pages/dashboard.css"
    >

    

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

</head>

<body>

    <div class="mobile-app">

        <!-- Navbar -->
        <nav class="navbar bg-white px-3 py-3">

            <div class="container-fluid p-0">

                <!-- Logo -->
                <a
                    href="#"
                    class="navbar-brand d-flex align-items-center gap-2"
                >
                    <strong>MLBB</strong>
                    <span>GUIDE</span>
                </a>

                <!-- Navigation Icon -->
                <div class="d-flex align-items-center gap-3">

                    <button
                        class="btn p-0"
                        type="button"
                    >
                        🔔
                    </button>

                    <button
                        class="btn p-0"
                        type="button"
                    >
                        ☰
                    </button>

                </div>

            </div>

        </nav>


        <!-- Hero Banner -->
        <section class="hero-banner">

            <div class="hero-content">

                <h1>
                    Selamat datang
                    <br>
                    di MLBB Guide
                </h1>

                <p>
                    Temukan hero terbaik, build item,
                    dan strategi untuk menang!
                </p>

            </div>

        </section>


        <!-- Top 5 Overpowered -->
        <section class="dashboard-section">

            <div class="section-header">

                <h2 class="section-title">
                    Top 5 Overpowered (WR)
                </h2>

                <a href="#" class="see-all">
                    Lihat Semua
                    <span>›</span>
                </a>

            </div>

            <div
                class="hero-scroll"
                id="topOverpowered"
            >
            </div>

        </section>


        <!-- Top 5 Most Banned -->
        <section class="dashboard-section">

            <div class="section-header">

                <h2 class="section-title">
                    Top 5 Most Banned (BR)
                </h2>

                <a href="#" class="see-all">
                    Lihat Semua
                    <span>›</span>
                </a>

            </div>

            <div
                class="hero-scroll"
                id="topMostBanned"
            >
            </div>

        </section>


        <!-- Perbandingan WR dan BR -->
        <section class="dashboard-section">

            <div class="section-header">

                <h2 class="section-title">
                    Perbandingan WR dan BR
                </h2>

                <a href="#" class="see-all">
                    Lihat detail
                    <span>›</span>
                </a>

            </div>

            <div class="chart-card">

                <div class="chart-legend">

                    <div class="legend-item">
                        <span class="legend-box legend-wr"></span>
                        <span>Overpowered (WR)</span>
                    </div>

                    <div class="legend-item">
                        <span class="legend-box legend-br"></span>
                        <span>Most Banned (BR)</span>
                    </div>

                </div>

                <div class="chart-container">

                    <canvas id="wrBrChart"></canvas>

                </div>

            </div>

        </section>


        <!-- Jadwal Pertandingan -->
        <section class="dashboard-section">

            <div class="section-header">

                <h2 class="section-title">
                    ⚔️ Jadwal Pertandingan
                </h2>

                <a href="#" class="see-all">
                    Lihat Semua
                    <span>›</span>
                </a>

            </div>

            <div
                class="match-card"
                id="matchList"
            >
            </div>

        </section>

    </div>


    <!-- Bootstrap JS -->
    <script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js">
    </script>

    <!-- Dashboard JS -->
    <script src="../../public/assets/js/pages/dashboard.js"></script>

</body>

</html>