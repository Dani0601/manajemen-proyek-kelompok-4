

<?php
require_once __DIR__ . '/../models/Match.php';

class MatchService{
    private MatchModel $matchModel;

    public function __construct(PDO $db)
    {
        $this->matchModel = new MatchModel($db);
    }


      // Detail pertandingan.
      // Target: GET /api/matches/{match_id}

    public function getMatchDetail(string $matchId): ?array
    {
        // Ambil informasi utama pertandingan
        $match = $this->matchModel->getMatchById($matchId);

        if ($match === null) {
            return null;
        }

        // Ambil daftar game
        $games = $this->matchModel->getGamesByMatchId($matchId);
        $gamesData = [];

        // Ambil data game beserta statistik pemain, bans, items, dan emblem
        foreach ($games as $game) {
            $gameId = (string) $game['game_id'];

            $rawPlayers = $this->matchModel->getPlayerStatsByGameId($gameId);
            $rawItems = $this->matchModel->getItemsByGameId($gameId);
            $rawEmblems = $this->matchModel->getEmblemsByGameId($gameId);

            // Kelompokkan item build per pemain
            $itemsByPlayer = [];
            foreach ($rawItems as $it) {
                $pId = (int) $it['player_id'];
                $itemsByPlayer[$pId][] = [
                    'item_slot' => (int) $it['item_slot'],
                    'item_id'   => $it['item_id'] !== null ? (int) $it['item_id'] : null,
                    'item_name' => $it['item_name'] ?? null,
                    'item_url'  => $it['item_url'],
                ];
            }

            // Kelompokkan set emblem & rune per pemain
            $emblemByPlayer = [];
            foreach ($rawEmblems as $emb) {
                $pId = (int) $emb['player_id'];
                $emblemByPlayer[$pId] = [
                    'emblem_id'  => $emb['emblem_id'] !== null ? (int) $emb['emblem_id'] : null,
                    'emblem_url' => $emb['emblem_url'],
                    'rune1_id'   => $emb['rune1_id'] !== null ? (int) $emb['rune1_id'] : null,
                    'rune1_url'  => $emb['rune1_url'],
                    'rune2_id'   => $emb['rune2_id'] !== null ? (int) $emb['rune2_id'] : null,
                    'rune2_url'  => $emb['rune2_url'],
                    'rune3_id'   => $emb['rune3_id'] !== null ? (int) $emb['rune3_id'] : null,
                    'rune3_url'  => $emb['rune3_url'],
                ];
            }

            // Gabungkan item dan emblem ke masing-masing profil pemain
            foreach ($rawPlayers as &$p) {
                $pId = (int) $p['player_id'];
                $p['items']  = $itemsByPlayer[$pId] ?? [];
                $p['emblem'] = $emblemByPlayer[$pId] ?? null;
            }
            unset($p);

            $gamesData[] = [
                'game_id'        => $gameId,
                'game_number'    => (int) $game['game_number'],
                'winner_team_id' => $game['winner_team_id'] !== null
                    ? (int) $game['winner_team_id']
                    : null,
                'bans'           => $this->matchModel->getBansByGameId($gameId),
                'player_stats'   => $rawPlayers,
                'gold_timeline'  => $this->matchModel->getGoldTimelineByGameId($gameId),
            ];
        }

        // Susun respons detail pertandingan
        return [
            'match_id' => $match['match_id'],
            'season_id' => (int) $match['season_id'],
            'week' => isset($match['week'])
                ? (int) $match['week']
                : null,
            'match_date' => $match['match_date'],
            'match_time' => $match['match_time'] ?? null,

            'team1' => [
                'team_id' => (int) $match['team1_id'],
                'team_name' => $match['team1_name'],
                'score' => $match['team1_score'] !== null
                    ? (int) $match['team1_score']
                    : null,
            ],

            'team2' => [
                'team_id' => (int) $match['team2_id'],
                'team_name' => $match['team2_name'],
                'score' => $match['team2_score'] !== null
                    ? (int) $match['team2_score']
                    : null,
            ],

            'winner_team_id' => $match['winner_team_id'] !== null
                ? (int) $match['winner_team_id']
                : null,

            'status' => $match['status'],
            'source' => $match['source'],
            'games'  => $gamesData,
        ];
    }


     // Detail draft pertandingan.
     // Target: GET /api/matches/{match_id}/drafts

    public function getMatchDrafts(string $matchId): ?array
    {
        // Pastikan pertandingan tersedia
        $match = $this->matchModel->getMatchById($matchId);

        if ($match === null) {
            return null;
        }

        // Ambil seluruh draft (bans & picks)
        $rawDrafts = $this->matchModel->getDraftsByMatchId($matchId);
        $draftsGrouped = [];

        // Kelompokkan berdasarkan nomor game
        foreach ($rawDrafts as $draft) {
            $gameNumber = (int) $draft['game_number'];

            if (!isset($draftsGrouped[$gameNumber])) {
                $draftsGrouped[$gameNumber] = [
                    'game_number' => $gameNumber,
                    'draft_sequence' => [],
                ];
            }

            $draftsGrouped[$gameNumber]['draft_sequence'][] = [
                'turn'          => (int) $draft['turn'],
                'team_id'       => isset($draft['team_id']) ? (int) $draft['team_id'] : null,
                'team_name'     => $draft['team_name'],
                'draft_type'    => $draft['draft_type'],
                'hero_id'       => isset($draft['hero_id']) ? (int) $draft['hero_id'] : null,
                'hero_name'     => $draft['hero_name'],
                'hero_icon_url' => $draft['hero_icon_url'] ?? null,
            ];
        }

        // Kembalikan format respons
        return [
            'match_id' => $matchId,
            'drafts' => array_values($draftsGrouped),
        ];
    }
}
