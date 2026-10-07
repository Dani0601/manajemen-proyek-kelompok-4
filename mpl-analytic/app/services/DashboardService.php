<?php

require_once dirname(__DIR__) . '/models/Dashboard.php';

class DashboardService
{
    private Dashboard $dashboard;

    public function __construct()
    {
        $this->dashboard = new Dashboard();
    }

    /**
     * Mengambil seluruh data yang dibutuhkan dashboard.
     */
    public function getDashboard(): ?array
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Ambil season terbaru
        |--------------------------------------------------------------------------
        */

        $season = $this->dashboard->getCurrentSeason();

        if ($season === null) {
            return null;
        }

        $seasonId = (int) $season['season_id'];


        /*
        |--------------------------------------------------------------------------
        | 2. Ambil week terakhir
        |--------------------------------------------------------------------------
        |
        | Karena seluruh pertandingan Season 17 sudah lewat,
        | dashboard menggunakan week terakhir yang tersedia.
        |
        */

        $lastWeek = $this->dashboard->getLastWeek(
            $seasonId
        );


        /*
        |--------------------------------------------------------------------------
        | 3. Ambil Top 5 Pick Rate
        |--------------------------------------------------------------------------
        */

        $topPickRate = $this->dashboard->getTopPickRate(
            $seasonId,
            5
        );


        /*
        |--------------------------------------------------------------------------
        | 4. Ambil Top 5 Win Rate
        |--------------------------------------------------------------------------
        */

        $topWinRate = $this->dashboard->getTopWinRate(
            $seasonId,
            5
        );


        /*
        |--------------------------------------------------------------------------
        | 5. Ambil jadwal week terakhir
        |--------------------------------------------------------------------------
        */

        $schedule = [];

        if ($lastWeek !== null) {
            $schedule = $this->dashboard->getSchedule(
                $seasonId,
                $lastWeek
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 6. Hero Meta
        |--------------------------------------------------------------------------
        |
        | Data lengkap hero season.
        |
        */

        $heroMeta = $this->dashboard->getHeroMeta(
            $seasonId
        );


        /*
        |--------------------------------------------------------------------------
        | 7. Return data dashboard
        |--------------------------------------------------------------------------
        */

        return [
            'season' => [
                'season_id' => (int) $season['season_id'],
                'league' => $season['league'],
                'season_number' => (int) $season['season_number'],
                'phase' => $season['phase'],
                'start_date' => $season['start_date'],
                'end_date' => $season['end_date'],
            ],

            'last_week' => $lastWeek,

            'top_pick_rate' => $topPickRate,

            'top_win_rate' => $topWinRate,

            'hero_meta' => $heroMeta,

            'schedule' => $schedule,
        ];
    }
}