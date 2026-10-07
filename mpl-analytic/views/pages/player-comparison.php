<!DOCTYPE html>
<html lang="id">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Perbandingan Pemain</title>

    <!-- Bootstrap -->
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >

    <!-- CSS utama -->
   <link
    rel="stylesheet"
    href="../../public/assets/css/style.css"
>

    <!-- CSS Player Comparison -->
   <link
    rel="stylesheet"
    href="../../public/assets/css/pages/comparison.css"
>

</head>


<body>

    <main class="player-comparison-page">

        <header class="comparison-header">

    <button
        type="button"
        class="header-back"
    >
        ←
    </button>

    <h1 class="comparison-title">
        Perbandingan Pemain
    </h1>

    <div class="header-actions">

        <button
            type="button"
            class="header-icon"
        >
            🔍
        </button>

        <button
            type="button"
            class="header-icon"
        >
            ☰
        </button>

    </div>

        </header>

    <section class="player-selector">

        <!-- Player A -->
        <div class="player-select">

            <span class="player-dot player-dot-blue"></span>

            <select id="playerA">
                <option value="101">
                    Kairi
                </option>

                <option value="102">
                    Albertt
                </option>
            </select>

        </div>


        <!-- Player B -->
        <div class="player-select">

            <span class="player-dot player-dot-orange"></span>

            <select id="playerB">
                <option value="101">
                    Kairi
                </option>

                <option value="102">
                    Albertt
                </option>

            </select>

        </div>

    </section>

    <section class="players-versus">

    <!-- Player A -->
    <div class="player-card" id="playerCardA">

        <img
            id="playerAHeroImage"
            src="https://placehold.co/140x70"
            alt="Lancelot"
            class="player-hero-image"
        >

        <h2 class="hero-name" id="playerAHeroName">
            Lancelot
        </h2>

        <p class="team-name" id="playerATeam">
            ONIC Esports
        </p>

        <p class="player-role" id="playerARole">
            Jungler
        </p>

    </div>


    <!-- VS -->
    <div class="vs-badge">
        Vs
    </div>


    <!-- Player B -->
    <div class="player-card" id="playerCardB">

        <img
            id="playerBHeroImage"
            src="https://placehold.co/140x70"
            alt="Ling"
            class="player-hero-image"
        >

        <h2 class="hero-name" id="playerBHeroName">
            Ling
        </h2>

        <p class="team-name" id="playerBTeam">
            ONIC Esports
        </p>

        <p class="player-role" id="playerBRole">
            Jungler
        </p>

    </div>

        </section>

        <section class="comparison-chart-section">

    <h2 class="section-title">
        Perbandingan Pemain
    </h2>

    <div class="chart-card">

        <div class="chart-legend">

            <span>
                <span class="legend-blue"></span>
                Kairi
            </span>

            <span>
                <span class="legend-orange"></span>
                Albertt
            </span>

        </div>

        <div class="radar-container">

            <canvas id="playerRadarChart"></canvas>

        </div>

    </div>

        </section>        

       <section class="stats-section">

    <h2 class="section-title">
        Statistik Liga
    </h2>

    <div class="stats-card">

        <div class="stat-row">

            <span class="stat-value blue" id="playerAMatches">
                48
            </span>

            <span class="stat-label">
                Match dimainkan
            </span>

            <span class="stat-value orange" id="playerBMatches">
                45
            </span>

        </div>


        <div class="stat-row">

            <span class="stat-value blue" id="playerAKda">
                5.2
            </span>

            <span class="stat-label">
                KDA rata-rata
            </span>

            <span class="stat-value orange" id="playerBKda">
                4.8
            </span>

        </div>


        <div class="stat-row">

            <span class="stat-value blue" id="playerAKp">
                74 %
            </span>

            <span class="stat-label">
                Kill Participation
            </span>

            <span class="stat-value orange" id="playerBKp">
                71 %
            </span>

        </div>

    </div>

</section>

       <section class="stats-section">

    <h2 class="section-title">
        Statistik Detail
    </h2>

    <div class="stats-card">

        <div class="stat-row">

            <span class="stat-value blue" id="playerAGpm">
                812
            </span>

            <span class="stat-label">
                Gold per menit
            </span>

            <span class="stat-value orange" id="playerBGpm">
                790
            </span>

        </div>


        <div class="stat-row">

            <span class="stat-value blue" id="playerADpm">
                1,240
            </span>

            <span class="stat-label">
                Damage per menit
            </span>

            <span class="stat-value orange" id="playerBDpm">
                1,130
            </span>

        </div>


        <div class="stat-row">

            <span class="stat-value blue" id="playerAObjectives">
                31
            </span>

            <span class="stat-label">
                Objective dikuasai
            </span>

            <span class="stat-value orange" id="playerBObjectives">
                34
            </span>

        </div>

    </div>

</section>


       <section class="stats-section">

    <h2 class="section-title">
        Performa (win rate)
    </h2>

    <div class="winrate-card">

        <div class="winrate-row">

            <span class="winrate-name" id="playerAWinrateName">
                Kairi
            </span>

            <div class="winrate-track">
                <div
                    class="winrate-fill blue-fill"
                    id="playerAWinrateBar"
                    style="width: 68.7%;"
                ></div>
            </div>

            <span class="winrate-value" id="playerAWinrateValue">
                68.7 %
            </span>

        </div>


        <div class="winrate-row">

            <span class="winrate-name" id="playerBWinrateName">
                Albertt
            </span>

            <div class="winrate-track">
                <div
                    class="winrate-fill orange-fill"
                    id="playerBWinrateBar"
                    style="width: 64.2%;"
                ></div>
            </div>

            <span class="winrate-value" id="playerBWinrateValue">
                64.2 %
            </span>

        </div>

    </div>

</section>

        
    </main>


    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- Player Comparison JS -->
    <script
    src="../../public/assets/js/pages/comparison.js"
></script>

</body>

</html>