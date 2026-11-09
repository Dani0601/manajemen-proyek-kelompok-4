<?php
// app/services/TeamService.php

require_once __DIR__ . '/../models/Team.php';

class TeamService
{
    private Team $teamModel;

    public function __construct(PDO $db)
    {
        $this->teamModel = new Team($db);
    }

    // =========================================================================
    // GET /api/teams
    // =========================================================================

    public function getAllTeams(): array
    {
        return $this->teamModel->getAllTeams();
    }

    // =========================================================================
    // GET /api/teams/{id}
    // =========================================================================

    public function getTeamById(int $teamId): ?array
    {
        return $this->teamModel->findById($teamId);
    }

    // =========================================================================
    // GET /api/teams/{id}/stats?season={seasonId}
    // =========================================================================

    public function getTeamSeasonStats(int $teamId, int $seasonId): ?array
    {
        $team = $this->teamModel->findById($teamId);

        if (!$team) {
            return null;
        }

        $raw = $this->teamModel->getTeamSeasonStats($teamId, $seasonId);

        if (!$raw) {
            // Tim ada, tapi tidak memiliki data pada season ini
            return [
                'team'    => $team,
                'season'  => $seasonId,
                'message' => 'Tidak ada data pertandingan untuk season ini.',
                'stats'   => null,
            ];
        }

        $matchStats = $raw['match_stats'];
        $gameStats  = $raw['game_stats'];
        $players    = $raw['players'];

        $totalMatches = (int) ($matchStats['total_matches'] ?? 0);
        $matchWins    = (int) ($matchStats['match_wins']    ?? 0);
        $matchLosses  = (int) ($matchStats['match_losses']  ?? 0);

        $totalGames  = (int)   ($gameStats['total_games']         ?? 0);
        $gameWins    = (int)   ($gameStats['game_wins']           ?? 0);
        $gameLosses  = (int)   ($gameStats['game_losses']         ?? 0);
        $avgDuration = (float) ($gameStats['avg_duration_seconds'] ?? 0);
        $totalKills  = (int)   ($gameStats['total_kills']         ?? 0);
        $totalDeaths = (int)   ($gameStats['total_deaths']        ?? 0);

        $matchWinRate = $totalMatches > 0
            ? round(($matchWins / $totalMatches) * 100, 2)
            : 0.0;

        $gameWinRate = $totalGames > 0
            ? round(($gameWins / $totalGames) * 100, 2)
            : 0.0;

        $avgKillsPerGame  = $totalGames > 0 ? round($totalKills  / $totalGames, 2) : 0.0;
        $avgDeathsPerGame = $totalGames > 0 ? round($totalDeaths / $totalGames, 2) : 0.0;

        return [
            'team'   => $team,
            'season' => $seasonId,
            'stats'  => [
                'matches' => [
                    'total'    => $totalMatches,
                    'wins'     => $matchWins,
                    'losses'   => $matchLosses,
                    'win_rate' => $matchWinRate,
                ],
                'games' => [
                    'total'                => $totalGames,
                    'wins'                 => $gameWins,
                    'losses'               => $gameLosses,
                    'win_rate'             => $gameWinRate,
                    'avg_duration_seconds' => (int) $avgDuration,
                    'avg_kills_per_game'   => $avgKillsPerGame,
                    'avg_deaths_per_game'  => $avgDeathsPerGame,
                ],
            ],
            'players' => $players,
        ];
    }

    // =========================================================================
    // GET /api/teams/{id}/matches?season={seasonId}&page={page}&limit={limit}
    // =========================================================================

    public function getTeamMatches(
        int $teamId,
        int $seasonId,
        int $page  = 1,
        int $limit = 20
    ): ?array {
        $team = $this->teamModel->findById($teamId);

        if (!$team) {
            return null;
        }

        $offset = ($page - 1) * $limit;
        $rows   = $this->teamModel->getTeamMatches($teamId, $seasonId, $limit, $offset);
        $total  = $this->teamModel->countTeamMatches($teamId, $seasonId);

        // Transformasi menjadi format yang bersih untuk frontend
        $matches = array_map(function (array $m) use ($teamId) {
            $isTeam1 = ((int) $m['team1_id'] === $teamId);
            $result  = null;

            if ($m['winner_team_id'] !== null) {
                $result = ((int) $m['winner_team_id'] === $teamId) ? 'win' : 'loss';
            }

            return [
                'match_id'   => $m['match_id'],
                'week'       => (int) $m['week'],
                'match_date' => $m['match_date'],
                'match_time' => $m['match_time'],
                'status'     => $m['status'],
                'team'       => [
                    'team_id'   => $isTeam1 ? (int) $m['team1_id']   : (int) $m['team2_id'],
                    'team_name' => $isTeam1 ? $m['team1_name']        : $m['team2_name'],
                    'team_code' => $isTeam1 ? $m['team1_code']        : $m['team2_code'],
                    'logo_url'  => $isTeam1 ? $m['team1_logo_url']    : $m['team2_logo_url'],
                    'score'     => $isTeam1 ? (int) $m['team1_score'] : (int) $m['team2_score'],
                ],
                'opponent'   => [
                    'team_id'   => $isTeam1 ? (int) $m['team2_id']   : (int) $m['team1_id'],
                    'team_name' => $isTeam1 ? $m['team2_name']        : $m['team1_name'],
                    'team_code' => $isTeam1 ? $m['team2_code']        : $m['team1_code'],
                    'logo_url'  => $isTeam1 ? $m['team2_logo_url']    : $m['team1_logo_url'],
                    'score'     => $isTeam1 ? (int) $m['team2_score'] : (int) $m['team1_score'],
                ],
                'winner_team_id' => $m['winner_team_id'],
                'result'         => $result,
            ];
        }, $rows);

        return [
            'team'       => $team,
            'season'     => $seasonId,
            'pagination' => [
                'page'        => $page,
                'limit'       => $limit,
                'total'       => $total,
                'total_pages' => (int) ceil($total / $limit),
            ],
            'matches' => $matches,
        ];
    }
}

