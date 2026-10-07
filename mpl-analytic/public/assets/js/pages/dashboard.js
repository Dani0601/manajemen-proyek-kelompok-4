// ========================================
// Dashboard Mock Data
// ========================================

const mockDashboardData = {
    status: "success",
    code: 200,
    message: "Meta summary fetched successfully",

    data: {
        season: 13,

        patch_version: "1.8.66",

        upcoming_match: {
            match_id: 502,

            team_a: {
                name: "Bigetron Alpha",
                logo: "/images/btr.png"
            },

            team_b: {
                name: "ONIC Esports",
                logo: "/images/onic.png"
            },

            scheduled_at: "2026-03-28T15:00:00Z"
        },

        top_picked_heroes: [
            {
                hero_id: 101,
                hero_name: "Nolan",
                primary_role: "Assassin",
                pick_rate: 68.5,
                win_rate: 54.2
            },

            {
                hero_id: 102,
                hero_name: "Joy",
                primary_role: "Assassin",
                pick_rate: 65.2,
                win_rate: 56.8
            },

            {
                hero_id: 103,
                hero_name: "Fanny",
                primary_role: "Assassin",
                pick_rate: 61.4,
                win_rate: 62.8
            },

            {
                hero_id: 104,
                hero_name: "Ling",
                primary_role: "Assassin",
                pick_rate: 58.7,
                win_rate: 58.7
            },

            {
                hero_id: 105,
                hero_name: "Beatrix",
                primary_role: "Marksman",
                pick_rate: 55.3,
                win_rate: 56.3
            }
        ],

        top_banned_heroes: [
            {
                hero_id: 201,
                hero_name: "Lancelot",
                primary_role: "Assassin",
                ban_rate: 78.2,
                win_rate: 54.9
            },

            {
                hero_id: 202,
                hero_name: "Fanny",
                primary_role: "Assassin",
                ban_rate: 72.6,
                win_rate: 62.8
            },

            {
                hero_id: 203,
                hero_name: "Ling",
                primary_role: "Assassin",
                ban_rate: 68.9,
                win_rate: 58.7
            },

            {
                hero_id: 204,
                hero_name: "Hayabusa",
                primary_role: "Assassin",
                ban_rate: 65.4,
                win_rate: 55.2
            },

            {
                hero_id: 205,
                hero_name: "Selena",
                primary_role: "Assassin",
                ban_rate: 61.7,
                win_rate: 57.1
            }
        ]
    }
};


// ========================================
// Ambil Data
// ========================================

const pickedHeroes =
    mockDashboardData.data.top_picked_heroes;

const bannedHeroes =
    mockDashboardData.data.top_banned_heroes;


// ========================================
// Chart Labels
// ========================================

const chartLabels = [
    ...new Set([
        ...pickedHeroes.map(hero => hero.hero_name),
        ...bannedHeroes.map(hero => hero.hero_name)
    ])
];


// ========================================
// Top 5 Overpowered
// ========================================

const topOverpoweredContainer =
    document.getElementById("topOverpowered");

pickedHeroes.forEach((hero, index) => {

    topOverpoweredContainer.innerHTML += `
        <div class="hero-card">

            <div class="hero-image-wrapper">

                <span class="rank-badge">
                    ${index + 1}
                </span>

                <img
                    src="https://placehold.co/70x70"
                    alt="${hero.hero_name}"
                    class="hero-image"
                >

            </div>

            <div class="hero-name">
                ${hero.hero_name}
            </div>

            <div class="hero-rate">
                WR ${hero.win_rate}%
            </div>

        </div>
    `;

});


// ========================================
// Top 5 Most Banned
// ========================================

const topMostBannedContainer =
    document.getElementById("topMostBanned");

bannedHeroes.forEach((hero, index) => {

    topMostBannedContainer.innerHTML += `
        <div class="hero-card">

            <div class="hero-image-wrapper">

                <span class="rank-badge">
                    ${index + 1}
                </span>

                <img
                    src="https://placehold.co/70x70"
                    alt="${hero.hero_name}"
                    class="hero-image"
                >

            </div>

            <div class="hero-name">
                ${hero.hero_name}
            </div>

            <div class="hero-rate">
                BR ${hero.ban_rate}%
            </div>

        </div>
    `;

});


// ========================================
// Jadwal Pertandingan
// ========================================

const mockMatches = [
    {
        home_team: "RRQ Hoshi",
        home_logo: "/images/rrq.png",

        away_team: "ONIC Esports",
        away_logo: "/images/onic.png",

        time: "14:00"
    },

    {
        home_team: "EVOS Glory",
        home_logo: "/images/evos.png",

        away_team: "Bigetron Alpha",
        away_logo: "/images/btr.png",

        time: "16:30"
    },

    {
        home_team: "Aura Fire",
        home_logo: "/images/aura.png",

        away_team: "Geek Fam",
        away_logo: "/images/geek.png",

        time: "19:00"
    }
];

const matchList =
    document.getElementById("matchList");

mockMatches.forEach(match => {

    matchList.innerHTML += `
        <div class="match-row">

            <div class="team team-left">

                <span class="team-name">
                    ${match.home_team}
                </span>

                <img
                    src="https://placehold.co/32x32"
                    alt="${match.home_team}"
                    class="team-logo"
                >

            </div>


            <div class="match-info">

                <span class="match-vs">
                    Vs
                </span>

                <span class="match-time">
                    ${match.time}
                </span>

            </div>


            <div class="team team-right">

                <img
                    src="https://placehold.co/32x32"
                    alt="${match.away_team}"
                    class="team-logo"
                >

                <span class="team-name">
                    ${match.away_team}
                </span>

            </div>

        </div>
    `;

});


// ========================================
// Chart.js - WR vs BR
// ========================================

const ctx =
    document.getElementById("wrBrChart");

new Chart(ctx, {

    type: "bar",

    data: {

        labels: chartLabels,

        datasets: [

            {
                label: "Overpowered (WR)",

                data: chartLabels.map(heroName => {

                    const hero = pickedHeroes.find(
                        item => item.hero_name === heroName
                    );

                    return hero
                        ? hero.win_rate
                        : null;

                }),

                backgroundColor: "#2874d0",

                borderRadius: 3,

                barThickness: 5
            },


            {
                label: "Most Banned (BR)",

                data: chartLabels.map(heroName => {

                    const hero = bannedHeroes.find(
                        item => item.hero_name === heroName
                    );

                    return hero
                        ? hero.ban_rate
                        : null;

                }),

                backgroundColor: "#f28c28",

                borderRadius: 3,

                barThickness: 5
            }

        ]

    },


    options: {

        indexAxis: "y",

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                display: false
            },

            tooltip: {

                enabled: true,

                callbacks: {

                    label: function(context) {

                        return context.dataset.label
                            + ": "
                            + context.raw
                            + "%";

                    }

                }

            }

        },


        scales: {

            x: {

                min: 0,

                max: 100,

                ticks: {

                    stepSize: 25,

                    font: {
                        size: 7
                    },

                    callback: function(value) {
                        return value + "%";
                    }

                },

                grid: {
                    color: "#dddddd"
                }

            },


            y: {

                ticks: {

                    font: {
                        size: 7
                    }

                },

                grid: {
                    display: false
                }

            }

        }

    }

});