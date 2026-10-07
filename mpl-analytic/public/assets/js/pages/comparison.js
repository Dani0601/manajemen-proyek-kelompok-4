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