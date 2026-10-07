<?php
// app/models/Match.php

class MatchModel {
    private $db;

    public function __construct($dbConnection) {
        $this->db =$dbConnection;
    }

    /**
     * 1. Mengambil Informasi Dasar Pertandingan (Match)
     * Target: Data utama untuk GET /matches/{match_id}
     */
    public function getMatchById($matchId) {$sql = "SELECT 
                    m.match_id, 
                    m.season_id, 
                    m.match_date, 
                    t1.team_id AS team_a_id, 
                    t1.short_code AS team_a_code, 
                    m.team_a_score, 
                    t2.team_id AS team_b_id, 
                    t2.short_code AS team_b_code, 
                    m.team_b_score, 
                    m.winner_team_id 
                FROM matches m
                JOIN teams t1 ON m.team_a_id = t1.team_id
                JOIN teams t2 ON m.team_b_id = t2.team_id
                WHERE m.match_id = :match_id";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':match_id' =>$matchId]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * 2. Mengambil Daftar Game di dalam sebuah Match
     */
    public function getGamesByMatchId($matchId) {$sql = "SELECT 
                    game_id, 
                    game_number, 
                    duration_seconds, 
                    winner_team_id 
                FROM games 
                WHERE match_id = :match_id 
                ORDER BY game_number ASC";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':match_id' =>$matchId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * 3. Mengambil Statistik Player (KDA) per Game
     * Target: Array `player_stats` pada GET /matches/{match_id}
     */
    public function getPlayerStatsByGameId($gameId) {$sql = "SELECT 
                    p.player_id, 
                    p.nickname, 
                    h.hero_name, 
                    gps.kills, 
                    gps.deaths, 
                    gps.assists, 
                    gps.gold_earned, 
                    gps.damage_to_heroes AS damage_dealt 
                FROM game_player_stats gps
                JOIN players p ON gps.player_id = p.player_id
                JOIN heroes h ON gps.hero_id = h.hero_id
                WHERE gps.game_id = :game_id";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':game_id' =>$gameId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * 4. Mengambil Timeline Gold per Game
     * Target: Array `gold_timeline` pada GET /matches/{match_id}
     */
    public function getGoldTimelineByGameId($gameId) {
        // Asumsi tabel game_gold_timeline ada di database Anda
        $sql = "SELECT 
                    minute_mark AS minute, 
                    team_red_gold AS red_gold, 
                    team_blue_gold AS blue_gold 
                FROM game_gold_timeline 
                WHERE game_id = :game_id 
                ORDER BY minute_mark ASC";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':game_id' =>$gameId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * 5. Mengambil Riwayat Draft Pick & Ban
     * Target: GET /matches/{match_id}/drafts
     */
    public function getDraftsByMatchId($matchId) {$sql = "SELECT 
                    g.game_number, 
                    gd.pick_ban_turn AS turn, 
                    t.short_code AS team_short_code, 
                    gd.draft_type, 
                    h.hero_name 
                FROM game_drafts gd
                JOIN games g ON gd.game_id = g.game_id
                JOIN teams t ON gd.team_id = t.team_id
                JOIN heroes h ON gd.hero_id = h.hero_id
                WHERE g.match_id = :match_id 
                ORDER BY g.game_number ASC, gd.pick_ban_turn ASC";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':match_id' =>$matchId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>