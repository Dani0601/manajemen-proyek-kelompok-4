<?php
// app/services/MetaService.php
require_once __DIR__ . '/../models/HeroStats.php';

class MetaService {
    private $heroStatsModel;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->heroStatsModel = new HeroStats($db);
    }

    /* ------------------------------------------------------------------ */
    /*  HELPER: resolve season number → season_id                         */
    /* ------------------------------------------------------------------ */
    private function resolveSeasonId(int $seasonInput): int {
        $stmt = $this->db->prepare(
            "SELECT season_id FROM seasons
             WHERE season_id = :s1 OR season_number = :s2
             LIMIT 1"
        );
        $stmt->execute([':s1' => $seasonInput, ':s2' => $seasonInput]);
        $resolved = $stmt->fetchColumn();
        return $resolved !== false ? (int)$resolved : $seasonInput;
    }

    /* ================================================================== */
    /*  Card 14.1 — /api/meta/trends                                      */
    /*  Pick rate hero dari DATA TOURNAMENT (game_picks + games + matches) */
    /*  Bukan dari hero_season_stats (data rank).                          */
    /* ================================================================== */
    public function getHeroTrendsBySeason($seasonId = 18): array {
        $targetSeasonId = $this->resolveSeasonId((int)$seasonId);

        // Total game di season (dari tabel tournament)
        $totalStmt = $this->db->prepare(
            "SELECT COUNT(g.game_id) AS total_games
             FROM games g
             JOIN matches m ON g.match_id = m.match_id
             WHERE m.season_id = :sid"
        );
        $totalStmt->execute([':sid' => $targetSeasonId]);
        $totalGames = (int)($totalStmt->fetchColumn() ?: 0);

        if ($totalGames === 0) {
            return [
                'season_id'      => $targetSeasonId,
                'total_games'    => 0,
                'has_trend_data' => false,
                'heroes'         => [],
            ];
        }

        // Hitung pick & win langsung dari game_picks + game_players (data tournament)
        $sql = "SELECT
                    h.hero_id,
                    h.hero_name,
                    h.hero_url,
                    COUNT(gp.game_pick_id)                           AS total_picked,
                    ROUND(COUNT(gp.game_pick_id) / :total1 * 100, 2) AS pick_rate,
                    SUM(CASE
                        WHEN (gp.side = 'team1' AND g.winner_team_id = g.team1_id)
                          OR (gp.side = 'team2' AND g.winner_team_id = g.team2_id)
                        THEN 1 ELSE 0
                    END)                                              AS win_count,
                    ROUND(
                        SUM(CASE
                            WHEN (gp.side = 'team1' AND g.winner_team_id = g.team1_id)
                              OR (gp.side = 'team2' AND g.winner_team_id = g.team2_id)
                            THEN 1 ELSE 0
                        END) / COUNT(gp.game_pick_id) * 100, 2
                    )                                                 AS win_rate
                FROM game_picks gp
                JOIN games   g ON g.game_id  = gp.game_id
                JOIN matches m ON m.match_id = g.match_id
                JOIN heroes  h ON h.hero_id  = gp.hero_id
                WHERE m.season_id = :sid
                GROUP BY h.hero_id, h.hero_name, h.hero_url
                ORDER BY total_picked DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':total1', $totalGames, PDO::PARAM_INT);
        $stmt->bindValue(':sid',    $targetSeasonId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Ban rate per hero (dari game_bans)
        $banSql = "SELECT
                       gb.hero_id,
                       COUNT(gb.game_ban_id) AS ban_count,
                       ROUND(COUNT(gb.game_ban_id) / :total2 * 100, 2) AS ban_rate
                   FROM game_bans gb
                   JOIN games   g ON g.game_id  = gb.game_id
                   JOIN matches m ON m.match_id = g.match_id
                   WHERE m.season_id = :sid2
                   GROUP BY gb.hero_id";
        $banStmt = $this->db->prepare($banSql);
        $banStmt->bindValue(':total2', $totalGames, PDO::PARAM_INT);
        $banStmt->bindValue(':sid2',   $targetSeasonId, PDO::PARAM_INT);
        $banStmt->execute();
        $banMap = [];
        foreach ($banStmt->fetchAll(PDO::FETCH_ASSOC) as $b) {
            $banMap[(int)$b['hero_id']] = [
                'ban_count' => (int)$b['ban_count'],
                'ban_rate'  => (float)$b['ban_rate'],
            ];
        }

        $heroes = [];
        foreach ($rows as $row) {
            $heroId = (int)$row['hero_id'];
            $heroes[] = [
                'hero_id'       => $heroId,
                'hero_name'     => $row['hero_name'],
                'hero_icon_url' => $row['hero_url'] ?: null,
                'total_picked'  => (int)$row['total_picked'],
                'pick_rate'     => (float)$row['pick_rate'],
                'win_count'     => (int)$row['win_count'],
                'win_rate'      => (float)$row['win_rate'],
                'ban_count'     => $banMap[$heroId]['ban_count']  ?? 0,
                'ban_rate'      => $banMap[$heroId]['ban_rate']   ?? 0.0,
            ];
        }

        return [
            'season_id'      => $targetSeasonId,
            'total_games'    => $totalGames,
            'has_trend_data' => true,
            'hero_count'     => count($heroes),
            'heroes'         => $heroes,
        ];
    }

    /* ================================================================== */
    /*  Dashboard — /api/meta                                              */
    /*  Top overpowered & most banned dari DATA RANK (hero_season_stats)   */
    /* ================================================================== */
    public function getTopHeroesSummary($seasonId = 17) {
        // Ambil data mentah dari database (Model) — data rank
        $rawStats = $this->heroStatsModel->getMetaStatsBySeason($seasonId);

        // Helper: format hero entry — gunakan hero_url asli dari tabel heroes
        $formatHeroData = function($hero) {
            // Ambil hero_url dari DB jika tersedia di row
            $heroUrl = $hero['hero_url'] ?? null;
            if (!$heroUrl) {
                // Fallback: query langsung dari heroes table
                $stmt = $this->db->prepare("SELECT hero_url FROM heroes WHERE hero_id = :hid LIMIT 1");
                $stmt->execute([':hid' => $hero['hero_id']]);
                $heroUrl = $stmt->fetchColumn() ?: null;
            }

            return [
                "hero_id"       => (int)$hero['hero_id'],
                "hero_name"     => $hero['hero_name'],
                "hero_icon_url" => $heroUrl,
                "win_rate"      => (float)$hero['win_rate'],
                "pick_rate"     => (float)$hero['pick_rate'],
                "ban_rate"      => (float)$hero['ban_rate']
            ];
        };

        // 1. Top 5 Overpowered (Win Rate tertinggi, minimal pernah dipick)
        $overpowered = array_filter($rawStats, function($h) {
            return $h['total_picked'] > 0;
        });
        usort($overpowered, fn($a, $b) => $b['win_rate'] <=> $a['win_rate']);
        $topOverpowered = array_map($formatHeroData, array_slice($overpowered, 0, 5));

        // 2. Top 5 Most Banned (Ban Rate tertinggi)
        $mostBanned = array_filter($rawStats, function($h) {
            return $h['ban_rate'] > 0;
        });
        usort($mostBanned, fn($a, $b) => $b['ban_rate'] <=> $a['ban_rate']);
        $topBanned = array_map($formatHeroData, array_slice($mostBanned, 0, 5));

        return [
            "season"                => $seasonId,
            "top_overpowered_heroes" => $topOverpowered,
            "top_most_banned_heroes" => $topBanned
        ];
    }
}
?>