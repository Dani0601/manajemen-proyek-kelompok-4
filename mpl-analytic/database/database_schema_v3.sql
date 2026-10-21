-- ============================================================
-- MPL ANALYTIC - DATABASE SCHEMA V3
-- Mobile Legends: Bang Bang - MPL Indonesia Season 17
-- ============================================================

CREATE DATABASE IF NOT EXISTS mpl_analytic
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mpl_analytic;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_game_item_count;
DROP VIEW IF EXISTS v_game_emblem_count;
DROP VIEW IF EXISTS v_game_pick_count;
DROP VIEW IF EXISTS v_game_player_count;
DROP VIEW IF EXISTS v_hero_season_stats;
DROP VIEW IF EXISTS v_player_game_stats;
DROP VIEW IF EXISTS v_game_score;
DROP VIEW IF EXISTS v_match_summary;

DROP TABLE IF EXISTS scraping_logs;
DROP TABLE IF EXISTS hero_season_stats;
DROP TABLE IF EXISTS hero_base_stats;
DROP TABLE IF EXISTS game_items;
DROP TABLE IF EXISTS game_emblems;
DROP TABLE IF EXISTS game_picks;
DROP TABLE IF EXISTS game_players;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS master_items;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS heroes;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS seasons;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. SEASONS
-- ============================================================

CREATE TABLE seasons (
    season_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    league VARCHAR(100) NOT NULL,
    season_number INT UNSIGNED NOT NULL,
    phase VARCHAR(100) NOT NULL DEFAULT 'Regular Season',
    start_date DATE NULL,
    end_date DATE NULL,
    format VARCHAR(150) NULL,
    source VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_seasons_league_number_phase
        (league, season_number, phase)
) ENGINE=InnoDB;

-- ============================================================
-- 2. TEAMS
-- ============================================================

CREATE TABLE teams (
    team_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(150) NOT NULL,
    team_code VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_teams_name (team_name),
    UNIQUE KEY uq_teams_code (team_code)
) ENGINE=InnoDB;

-- ============================================================
-- 3. PLAYERS
-- ============================================================

CREATE TABLE players (
    player_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    player_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_players_name (player_name)
) ENGINE=InnoDB;

-- ============================================================
-- 4. HEROES
-- ============================================================

CREATE TABLE heroes (
    hero_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hero_name VARCHAR(150) NOT NULL,
    hero_slug VARCHAR(150) NULL,
    hero_url VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_heroes_name (hero_name),
    UNIQUE KEY uq_heroes_slug (hero_slug)
) ENGINE=InnoDB;

-- ============================================================
-- 5. MASTER ITEMS
-- ============================================================

CREATE TABLE master_items (
    item_id INT UNSIGNED PRIMARY KEY,
    item_url VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 6. SCHEDULES
-- ============================================================

CREATE TABLE schedules (
    schedule_id VARCHAR(80) PRIMARY KEY,
    season_id INT UNSIGNED NOT NULL,
    week INT UNSIGNED NOT NULL,
    match_date DATE NULL,
    match_time TIME NULL,
    team1_id INT UNSIGNED NULL,
    team2_id INT UNSIGNED NULL,
    status VARCHAR(50) NULL,
    source VARCHAR(100) NULL,
    source_match_id VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_schedules_source_match (source, source_match_id),
    KEY idx_schedules_season_week (season_id, week),
    KEY idx_schedules_date (match_date),
    KEY idx_schedules_team1 (team1_id),
    KEY idx_schedules_team2 (team2_id),

    CONSTRAINT fk_schedules_season
        FOREIGN KEY (season_id) REFERENCES seasons(season_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_schedules_team1
        FOREIGN KEY (team1_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_schedules_team2
        FOREIGN KEY (team2_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 7. MATCHES
-- One row = one series / BO3.
-- ============================================================

CREATE TABLE matches (
    match_id VARCHAR(80) PRIMARY KEY,
    season_id INT UNSIGNED NOT NULL,
    week INT UNSIGNED NOT NULL,
    match_date DATE NULL,
    match_time TIME NULL,
    team1_id INT UNSIGNED NOT NULL,
    team2_id INT UNSIGNED NOT NULL,
    team1_score TINYINT UNSIGNED NULL,
    team2_score TINYINT UNSIGNED NULL,
    winner_team_id INT UNSIGNED NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    source VARCHAR(100) NULL,
    source_match_id VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_matches_source_match (source, source_match_id),
    KEY idx_matches_season_week (season_id, week),
    KEY idx_matches_date (match_date),
    KEY idx_matches_team1 (team1_id),
    KEY idx_matches_team2 (team2_id),
    KEY idx_matches_winner (winner_team_id),

    CONSTRAINT fk_matches_season
        FOREIGN KEY (season_id) REFERENCES seasons(season_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_matches_team1
        FOREIGN KEY (team1_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_matches_team2
        FOREIGN KEY (team2_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_matches_winner
        FOREIGN KEY (winner_team_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 8. GAMES
-- One row = one individual game.
-- ============================================================

CREATE TABLE games (
    game_id VARCHAR(100) PRIMARY KEY,
    match_id VARCHAR(80) NOT NULL,
    source_match_id VARCHAR(100) NULL,
    game_number TINYINT UNSIGNED NOT NULL,
    team1_id INT UNSIGNED NOT NULL,
    team2_id INT UNSIGNED NOT NULL,
    winner_team_id INT UNSIGNED NULL,
    duration_seconds INT UNSIGNED NULL,
    team1_kills SMALLINT UNSIGNED NULL,
    team2_kills SMALLINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_games_match_number (match_id, game_number),
    KEY idx_games_source_match (source_match_id),
    KEY idx_games_team1 (team1_id),
    KEY idx_games_team2 (team2_id),
    KEY idx_games_winner (winner_team_id),

    CONSTRAINT fk_games_match
        FOREIGN KEY (match_id) REFERENCES matches(match_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_games_team1
        FOREIGN KEY (team1_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_games_team2
        FOREIGN KEY (team2_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_games_winner
        FOREIGN KEY (winner_team_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 9. GAME_PLAYERS
-- One row = one player per game. Expected 10/game.
-- ============================================================

CREATE TABLE game_players (
    player_game_id VARCHAR(120) PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    team_id INT UNSIGNED NOT NULL,
    side ENUM('team1', 'team2') NOT NULL,
    player_id INT UNSIGNED NOT NULL,
    hero_id INT UNSIGNED NULL,
    kills SMALLINT UNSIGNED NULL,
    deaths SMALLINT UNSIGNED NULL,
    assists SMALLINT UNSIGNED NULL,
    damage DECIMAL(15,3) NULL,
    damage_taken DECIMAL(15,3) NULL,
    turret_damage DECIMAL(15,3) NULL,
    gold DECIMAL(15,3) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_game_players_game_player (game_id, player_id),
    KEY idx_game_players_team (team_id),
    KEY idx_game_players_player (player_id),
    KEY idx_game_players_hero (hero_id),

    CONSTRAINT fk_game_players_game
        FOREIGN KEY (game_id) REFERENCES games(game_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_game_players_team
        FOREIGN KEY (team_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_players_player
        FOREIGN KEY (player_id) REFERENCES players(player_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_players_hero
        FOREIGN KEY (hero_id) REFERENCES heroes(hero_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 10. GAME_PICKS
-- One row = one hero pick/player/game. Expected 10/game.
-- ============================================================

CREATE TABLE game_picks (
    game_pick_id VARCHAR(120) PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    team_id INT UNSIGNED NOT NULL,
    side ENUM('team1', 'team2') NOT NULL,
    player_id INT UNSIGNED NOT NULL,
    hero_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_game_picks_game_player (game_id, player_id),
    KEY idx_game_picks_team (team_id),
    KEY idx_game_picks_player (player_id),
    KEY idx_game_picks_hero (hero_id),

    CONSTRAINT fk_game_picks_game
        FOREIGN KEY (game_id) REFERENCES games(game_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_game_picks_team
        FOREIGN KEY (team_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_picks_player
        FOREIGN KEY (player_id) REFERENCES players(player_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_picks_hero
        FOREIGN KEY (hero_id) REFERENCES heroes(hero_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 11. GAME_EMBLEMS
-- One row = one player/game. Expected 10/game.
-- ============================================================

CREATE TABLE game_emblems (
    game_emblem_id VARCHAR(120) PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    team_id INT UNSIGNED NOT NULL,
    side ENUM('team1', 'team2') NOT NULL,
    player_id INT UNSIGNED NOT NULL,
    hero_id INT UNSIGNED NULL,

    emblem_id INT UNSIGNED NULL,
    emblem_url VARCHAR(500) NULL,

    rune1_id INT UNSIGNED NULL,
    rune1_url VARCHAR(500) NULL,
    rune2_id INT UNSIGNED NULL,
    rune2_url VARCHAR(500) NULL,
    rune3_id INT UNSIGNED NULL,
    rune3_url VARCHAR(500) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_game_emblems_game_player (game_id, player_id),
    KEY idx_game_emblems_team (team_id),
    KEY idx_game_emblems_player (player_id),
    KEY idx_game_emblems_hero (hero_id),

    CONSTRAINT fk_game_emblems_game
        FOREIGN KEY (game_id) REFERENCES games(game_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_game_emblems_team
        FOREIGN KEY (team_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_emblems_player
        FOREIGN KEY (player_id) REFERENCES players(player_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_emblems_hero
        FOREIGN KEY (hero_id) REFERENCES heroes(hero_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 12. GAME_ITEMS
-- Six slots/player/game, including empty slots as NULL.
-- Expected 60/game.
-- ============================================================

CREATE TABLE game_items (
    game_item_id VARCHAR(140) PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    team_id INT UNSIGNED NOT NULL,
    side ENUM('team1', 'team2') NOT NULL,
    player_id INT UNSIGNED NOT NULL,
    hero_id INT UNSIGNED NULL,
    item_slot TINYINT UNSIGNED NOT NULL,
    item_id INT UNSIGNED NULL,
    item_url VARCHAR(500) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_game_items_slot (game_id, player_id, item_slot),
    KEY idx_game_items_team (team_id),
    KEY idx_game_items_player (player_id),
    KEY idx_game_items_hero (hero_id),
    KEY idx_game_items_item (item_id),

    CONSTRAINT fk_game_items_game
        FOREIGN KEY (game_id) REFERENCES games(game_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_game_items_team
        FOREIGN KEY (team_id) REFERENCES teams(team_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_items_player
        FOREIGN KEY (player_id) REFERENCES players(player_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_game_items_hero
        FOREIGN KEY (hero_id) REFERENCES heroes(hero_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_game_items_master_item
        FOREIGN KEY (item_id) REFERENCES master_items(item_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 13. HERO_BASE_STATS
-- Base Stats table from mlbb.io.
-- ============================================================

CREATE TABLE hero_base_stats (
    hero_base_stat_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    hero_id INT UNSIGNED NOT NULL,

    hp_lv1 DECIMAL(15,3) NULL,
    hp_lv15 DECIMAL(15,3) NULL,
    hp_per_level DECIMAL(15,3) NULL,

    hp_regen_lv1 DECIMAL(15,3) NULL,
    hp_regen_lv15 DECIMAL(15,3) NULL,
    hp_regen_per_level DECIMAL(15,3) NULL,

    physical_attack_lv1 DECIMAL(15,3) NULL,
    physical_attack_lv15 DECIMAL(15,3) NULL,
    physical_attack_per_level DECIMAL(15,3) NULL,

    physical_defense_lv1 DECIMAL(15,3) NULL,
    physical_defense_lv15 DECIMAL(15,3) NULL,
    physical_defense_per_level DECIMAL(15,3) NULL,

    magic_defense_lv1 DECIMAL(15,3) NULL,
    magic_defense_lv15 DECIMAL(15,3) NULL,
    magic_defense_per_level DECIMAL(15,3) NULL,

    attack_speed_lv1 DECIMAL(15,3) NULL,
    attack_speed_lv15 DECIMAL(15,3) NULL,
    attack_speed_per_level DECIMAL(15,3) NULL,

    movement_speed_lv1 DECIMAL(15,3) NULL,
    movement_speed_lv15 DECIMAL(15,3) NULL,
    movement_speed_per_level DECIMAL(15,3) NULL,

    mana_lv1 DECIMAL(15,3) NULL,
    mana_lv15 DECIMAL(15,3) NULL,
    mana_per_level DECIMAL(15,3) NULL,

    mana_regen_lv1 DECIMAL(15,3) NULL,
    mana_regen_lv15 DECIMAL(15,3) NULL,
    mana_regen_per_level DECIMAL(15,3) NULL,

    energy_lv1 DECIMAL(15,3) NULL,
    energy_lv15 DECIMAL(15,3) NULL,
    energy_per_level DECIMAL(15,3) NULL,

    energy_regen_lv1 DECIMAL(15,3) NULL,
    energy_regen_lv15 DECIMAL(15,3) NULL,
    energy_regen_per_level DECIMAL(15,3) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_hero_base_stats_hero (hero_id),

    CONSTRAINT fk_hero_base_stats_hero
        FOREIGN KEY (hero_id) REFERENCES heroes(hero_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 14. HERO_SEASON_STATS
-- Pick/Win only. Ban intentionally omitted.
-- ============================================================

CREATE TABLE hero_season_stats (
    hero_season_stat_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    season_id INT UNSIGNED NOT NULL,
    hero_id INT UNSIGNED NOT NULL,

    pick_count INT UNSIGNED NOT NULL DEFAULT 0,
    pick_rate DECIMAL(8,4) NOT NULL DEFAULT 0,

    win_count INT UNSIGNED NOT NULL DEFAULT 0,
    win_rate DECIMAL(8,4) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_hero_season_stats (season_id, hero_id),
    KEY idx_hss_hero (hero_id),
    KEY idx_hss_pick_rate (pick_rate),
    KEY idx_hss_win_rate (win_rate),

    CONSTRAINT fk_hss_season
        FOREIGN KEY (season_id) REFERENCES seasons(season_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_hss_hero
        FOREIGN KEY (hero_id) REFERENCES heroes(hero_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 15. SCRAPING_LOGS
-- One row per dataset per execution.
-- ============================================================

CREATE TABLE scraping_logs (
    log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    run_id CHAR(36) NULL,
    run_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    dataset VARCHAR(100) NOT NULL,
    status ENUM('success', 'failed', 'partial') NOT NULL,

    records_processed INT UNSIGNED NOT NULL DEFAULT 0,
    message TEXT NULL,

    KEY idx_scraping_logs_run (run_id),
    KEY idx_scraping_logs_dataset_time (dataset, run_time),
    KEY idx_scraping_logs_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- 16. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_match_summary AS
SELECT
    m.match_id,
    m.season_id,
    m.week,
    m.match_date,
    m.match_time,
    t1.team_name AS team1,
    t2.team_name AS team2,
    m.team1_score,
    m.team2_score,
    tw.team_name AS winner,
    m.status,
    m.source,
    m.source_match_id
FROM matches m
JOIN teams t1 ON t1.team_id = m.team1_id
JOIN teams t2 ON t2.team_id = m.team2_id
LEFT JOIN teams tw ON tw.team_id = m.winner_team_id;

CREATE OR REPLACE VIEW v_game_score AS
SELECT
    g.game_id,
    g.match_id,
    g.game_number,
    t1.team_name AS team1,
    t2.team_name AS team2,
    tw.team_name AS winner,
    g.duration_seconds,
    g.team1_kills,
    g.team2_kills
FROM games g
JOIN teams t1 ON t1.team_id = g.team1_id
JOIN teams t2 ON t2.team_id = g.team2_id
LEFT JOIN teams tw ON tw.team_id = g.winner_team_id;

CREATE OR REPLACE VIEW v_player_game_stats AS
SELECT
    gp.player_game_id,
    gp.game_id,
    g.match_id,
    g.game_number,
    t.team_name AS team,
    gp.side,
    p.player_name AS player,
    h.hero_name AS hero,
    gp.kills,
    gp.deaths,
    gp.assists,
    gp.damage,
    gp.damage_taken,
    gp.turret_damage,
    gp.gold
FROM game_players gp
JOIN games g ON g.game_id = gp.game_id
JOIN teams t ON t.team_id = gp.team_id
JOIN players p ON p.player_id = gp.player_id
LEFT JOIN heroes h ON h.hero_id = gp.hero_id;

CREATE OR REPLACE VIEW v_hero_season_stats AS
SELECT
    hss.hero_season_stat_id,
    s.league,
    s.season_number,
    s.phase,
    h.hero_name AS hero,
    hss.pick_count,
    hss.pick_rate,
    hss.win_count,
    hss.win_rate
FROM hero_season_stats hss
JOIN seasons s ON s.season_id = hss.season_id
JOIN heroes h ON h.hero_id = hss.hero_id;

-- ============================================================
-- 17. VALIDATION VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_game_player_count AS
SELECT game_id, COUNT(*) AS player_count
FROM game_players
GROUP BY game_id;

CREATE OR REPLACE VIEW v_game_pick_count AS
SELECT game_id, COUNT(*) AS pick_count
FROM game_picks
GROUP BY game_id;

CREATE OR REPLACE VIEW v_game_emblem_count AS
SELECT game_id, COUNT(*) AS emblem_count
FROM game_emblems
GROUP BY game_id;

CREATE OR REPLACE VIEW v_game_item_count AS
SELECT game_id, COUNT(*) AS item_slot_count
FROM game_items
GROUP BY game_id;

-- ============================================================
-- END OF SCHEMA V3
-- ============================================================
