const comparisonData = {
    comparison_meta: {
        season: 17,

        metrics_labels: [
            "Damage Output",
            "Damage Taken",
            "Gold Efficiency",
            "Kill Participation",
            "Objective Control",
            "Survival Rate"
        ]
    },

    players: [
        {
            player_id: 101,

            nickname: "Kairi",

            team_name: "ONIC Esports",

            role: "Jungler",

            hero_name: "Lancelot",

            spider_stats: {
                damage_output: 92,
                damage_taken: 58,
                gold_efficiency: 95,
                kill_participation: 88,
                objective_control: 80,
                survival_rate: 90
            },

            raw_stats: {
                matches: 48,
                kda: 5.2,
                kp_percent: 74,
                gpm: 812,
                dpm: 1240,
                objectives: 31,
                win_rate: 68.7
            }
        },

        {
            player_id: 102,

            nickname: "Albertt",

            team_name: "ONIC Esports",

            role: "Jungler",

            hero_name: "Ling",

            spider_stats: {
                damage_output: 86,
                damage_taken: 62,
                gold_efficiency: 89,
                kill_participation: 84,
                objective_control: 82,
                survival_rate: 85
            },

            raw_stats: {
                matches: 45,
                kda: 4.8,
                kp_percent: 71,
                gpm: 790,
                dpm: 1130,
                objectives: 34,
                win_rate: 64.2
            }
        }
    ]
};


function getPlayerById(playerId) {
    return comparisonData.players.find(
        player => player.player_id === Number(playerId)
    );
}

const playerASelect = document.getElementById('playerA');
const playerBSelect = document.getElementById('playerB');

function populatePlayerSelectors() {
    comparisonData.players.forEach(player => {
        const optionA = document.createElement('option');
        optionA.value = player.player_id;
        optionA.textContent = player.nickname;

        const optionB = optionA.cloneNode(true);

        playerASelect.appendChild(optionA);
        playerBSelect.appendChild(optionB);
    });

    playerASelect.value = comparisonData.players[0].player_id;
    playerBSelect.value = comparisonData.players[1].player_id;
}

function updatePlayerCards(playerA, playerB) {
    document.getElementById('playerAHeroImage').src =
        playerA.hero_image_url || 'https://placehold.co/140x70';

    document.getElementById('playerAHeroImage').alt =
        playerA.hero_name;

    document.getElementById('playerAHeroName').textContent =
        playerA.hero_name;

    document.getElementById('playerATeam').textContent =
        playerA.team_name;

    document.getElementById('playerARole').textContent =
        playerA.role;


    document.getElementById('playerBHeroImage').src =
        playerB.hero_image_url || 'https://placehold.co/140x70';

    document.getElementById('playerBHeroImage').alt =
        playerB.hero_name;

    document.getElementById('playerBHeroName').textContent =
        playerB.hero_name;

    document.getElementById('playerBTeam').textContent =
        playerB.team_name;

    document.getElementById('playerBRole').textContent =
        playerB.role;
}

function updateStats(playerA, playerB) {

    // Statistik Liga

    document.getElementById('playerAMatches').textContent =
        playerA.raw_stats.matches;

    document.getElementById('playerBMatches').textContent =
        playerB.raw_stats.matches;


    document.getElementById('playerAKda').textContent =
        playerA.raw_stats.kda;

    document.getElementById('playerBKda').textContent =
        playerB.raw_stats.kda;


    document.getElementById('playerAKp').textContent =
        playerA.raw_stats.kp_percent + ' %';

    document.getElementById('playerBKp').textContent =
        playerB.raw_stats.kp_percent + ' %';


    // Statistik Detail

    document.getElementById('playerAGpm').textContent =
        playerA.raw_stats.gpm;

    document.getElementById('playerBGpm').textContent =
        playerB.raw_stats.gpm;


    document.getElementById('playerADpm').textContent =
        playerA.raw_stats.dpm.toLocaleString('en-US');

    document.getElementById('playerBDpm').textContent =
        playerB.raw_stats.dpm.toLocaleString('en-US');


    document.getElementById('playerAObjectives').textContent =
        playerA.raw_stats.objectives;

    document.getElementById('playerBObjectives').textContent =
        playerB.raw_stats.objectives;
}

function updateWinRate(playerA, playerB) {

    // Player A
    document.getElementById('playerAWinrateName').textContent =
        playerA.nickname;

    document.getElementById('playerAWinrateBar').style.width =
        playerA.raw_stats.win_rate + '%';

    document.getElementById('playerAWinrateValue').textContent =
        playerA.raw_stats.win_rate + ' %';


    // Player B
    document.getElementById('playerBWinrateName').textContent =
        playerB.nickname;

    document.getElementById('playerBWinrateBar').style.width =
        playerB.raw_stats.win_rate + '%';

    document.getElementById('playerBWinrateValue').textContent =
        playerB.raw_stats.win_rate + ' %';
}


function getRadarData(player) {
    return [
        player.spider_stats.damage_output,
        player.spider_stats.damage_taken,
        player.spider_stats.gold_efficiency,
        player.spider_stats.kill_participation,
        player.spider_stats.objective_control,
        player.spider_stats.survival_rate
    ];
}


const initialPlayerA = comparisonData.players[0];
const initialPlayerB = comparisonData.players[1];

const labels = comparisonData.comparison_meta.metrics_labels;

const radarCanvas = document.getElementById('playerRadarChart');

const playerRadarChart = new Chart(radarCanvas, {
    type: 'radar',

    data: {
        labels: labels,

       datasets: [
    {
        label: initialPlayerA.nickname,

        data: getRadarData(initialPlayerA),

        borderColor: '#2874d0',
        backgroundColor: 'rgba(40, 116, 208, 0.15)',
        pointBackgroundColor: '#2874d0',

        pointRadius: 3,
        borderWidth: 2
    },

    {
        label: initialPlayerB.nickname,

        data: getRadarData(initialPlayerB),

        borderColor: '#f28c28',
        backgroundColor: 'rgba(242, 140, 40, 0.15)',
        pointBackgroundColor: '#f28c28',

        pointRadius: 3,
        borderWidth: 2
    }
        ]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,

        scales: {
            r: {
                min: 0,
                max: 100,

                ticks: {
                    display: false
                },

                pointLabels: {
                    font: {
                        size: 8
                    },

                    color: '#222'
                },

                grid: {
                    color: '#aaa'
                },

                angleLines: {
                    color: '#aaa'
                }
            }
        },

        plugins: {
            legend: {
                display: false
            }
        }
    }
});


function updateComparison() {

    const playerA = getPlayerById(playerASelect.value);
    const playerB = getPlayerById(playerBSelect.value);

    if (!playerA || !playerB) {
        return;
    }

    // Validasi: Player A dan Player B tidak boleh sama
    if (playerA.player_id === playerB.player_id) {
        alert("Pemain A dan Pemain B harus berbeda.");
        return;
    }

    // Update Player Card
    updatePlayerCards(playerA, playerB);

    // Update Statistics
    updateStats(playerA, playerB);

    // Update Win Rate
    updateWinRate(playerA, playerB);

    // Update Radar Chart
    playerRadarChart.data.datasets[0].label =
        playerA.nickname;

    playerRadarChart.data.datasets[0].data =
        getRadarData(playerA);

    playerRadarChart.data.datasets[1].label =
        playerB.nickname;

    playerRadarChart.data.datasets[1].data =
        getRadarData(playerB);

    playerRadarChart.update();
}


playerASelect.addEventListener(
    'change',
    updateComparison
);

playerBSelect.addEventListener(
    'change',
    updateComparison
);


populatePlayerSelectors();

updateComparison();