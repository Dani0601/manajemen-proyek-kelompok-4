-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 02, 2026 at 06:41 AM
-- Server version: 8.0.30
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mpl_analytic`
--

-- --------------------------------------------------------

--
-- Table structure for table `games`
--

CREATE TABLE `games` (
  `game_id` int NOT NULL,
  `match_id` int NOT NULL,
  `game_number` int NOT NULL,
  `duration_seconds` int NOT NULL,
  `red_team_id` int NOT NULL,
  `blue_team_id` int NOT NULL,
  `winner_team_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `game_drafts`
--

CREATE TABLE `game_drafts` (
  `draft_id` int NOT NULL,
  `game_id` int NOT NULL,
  `team_id` int NOT NULL,
  `hero_id` int NOT NULL,
  `draft_type` varchar(50) NOT NULL,
  `pick_ban_turn` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `game_item_builds`
--

CREATE TABLE `game_item_builds` (
  `build_id` int NOT NULL,
  `stat_id` int NOT NULL,
  `item_id` int NOT NULL,
  `slot_position` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `game_player_stats`
--

CREATE TABLE `game_player_stats` (
  `stat_id` int NOT NULL,
  `game_id` int NOT NULL,
  `player_id` int NOT NULL,
  `hero_id` int NOT NULL,
  `kills` int DEFAULT '0',
  `deaths` int DEFAULT '0',
  `assists` int DEFAULT '0',
  `gold_earned` int DEFAULT '0',
  `damage_to_heroes` int DEFAULT '0',
  `turret_damage` int DEFAULT '0',
  `teamfight_percentage` decimal(5,2) DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `game_timelines`
--

CREATE TABLE `game_timelines` (
  `timeline_id` int NOT NULL,
  `game_id` int NOT NULL,
  `minute` int NOT NULL,
  `red_gold` int NOT NULL,
  `blue_gold` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `heroes`
--

CREATE TABLE `heroes` (
  `hero_id` int NOT NULL,
  `hero_name` varchar(255) NOT NULL,
  `primary_role` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hero_attributes`
--

CREATE TABLE `hero_attributes` (
  `attribute_id` int NOT NULL,
  `hero_id` int NOT NULL,
  `attribute_type` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `item_suitability_rules`
--

CREATE TABLE `item_suitability_rules` (
  `rule_id` int NOT NULL,
  `item_id` int NOT NULL,
  `target_attribute` varchar(255) NOT NULL,
  `suitability_status` varchar(100) NOT NULL,
  `reason` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `master_items`
--

CREATE TABLE `master_items` (
  `item_id` int NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `item_type` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `matches`
--

CREATE TABLE `matches` (
  `match_id` int NOT NULL,
  `season_id` int NOT NULL,
  `team_a_id` int NOT NULL,
  `team_b_id` int NOT NULL,
  `winner_team_id` int DEFAULT NULL,
  `match_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `player_id` int NOT NULL,
  `real_name` varchar(255) NOT NULL,
  `nickname` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `player_transfers`
--

CREATE TABLE `player_transfers` (
  `transfer_id` int NOT NULL,
  `player_id` int NOT NULL,
  `from_team_id` int DEFAULT NULL,
  `to_team_id` int NOT NULL,
  `season_id` int NOT NULL,
  `transfer_type` varchar(100) NOT NULL,
  `transfer_fee` decimal(15,2) DEFAULT NULL,
  `transfer_date` date NOT NULL,
  `loan_end_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recommended_builds`
--

CREATE TABLE `recommended_builds` (
  `build_rec_id` int NOT NULL,
  `hero_id` int NOT NULL,
  `build_name` varchar(255) NOT NULL,
  `playstyle_target` varchar(255) DEFAULT NULL,
  `description` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recommended_build_items`
--

CREATE TABLE `recommended_build_items` (
  `rec_item_id` int NOT NULL,
  `build_rec_id` int NOT NULL,
  `item_id` int NOT NULL,
  `slot_order` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `scraping_logs`
--

CREATE TABLE `scraping_logs` (
  `log_id` int NOT NULL,
  `run_time` datetime NOT NULL,
  `status` varchar(100) NOT NULL,
  `records_added` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `seasons`
--

CREATE TABLE `seasons` (
  `season_id` int NOT NULL,
  `season_number` int NOT NULL,
  `year` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teams`
--

CREATE TABLE `teams` (
  `team_id` int NOT NULL,
  `team_name` varchar(255) NOT NULL,
  `short_code` varchar(50) NOT NULL,
  `logo_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `team_rosters`
--

CREATE TABLE `team_rosters` (
  `roster_id` int NOT NULL,
  `team_id` int NOT NULL,
  `player_id` int NOT NULL,
  `season_id` int NOT NULL,
  `role` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `games`
--
ALTER TABLE `games`
  ADD PRIMARY KEY (`game_id`),
  ADD KEY `match_id` (`match_id`),
  ADD KEY `red_team_id` (`red_team_id`),
  ADD KEY `blue_team_id` (`blue_team_id`),
  ADD KEY `winner_team_id` (`winner_team_id`);

--
-- Indexes for table `game_drafts`
--
ALTER TABLE `game_drafts`
  ADD PRIMARY KEY (`draft_id`),
  ADD KEY `game_id` (`game_id`),
  ADD KEY `team_id` (`team_id`),
  ADD KEY `hero_id` (`hero_id`);

--
-- Indexes for table `game_item_builds`
--
ALTER TABLE `game_item_builds`
  ADD PRIMARY KEY (`build_id`),
  ADD KEY `stat_id` (`stat_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `game_player_stats`
--
ALTER TABLE `game_player_stats`
  ADD PRIMARY KEY (`stat_id`),
  ADD KEY `game_id` (`game_id`),
  ADD KEY `player_id` (`player_id`),
  ADD KEY `hero_id` (`hero_id`);

--
-- Indexes for table `game_timelines`
--
ALTER TABLE `game_timelines`
  ADD PRIMARY KEY (`timeline_id`),
  ADD KEY `game_id` (`game_id`);

--
-- Indexes for table `heroes`
--
ALTER TABLE `heroes`
  ADD PRIMARY KEY (`hero_id`);

--
-- Indexes for table `hero_attributes`
--
ALTER TABLE `hero_attributes`
  ADD PRIMARY KEY (`attribute_id`),
  ADD KEY `hero_id` (`hero_id`);

--
-- Indexes for table `item_suitability_rules`
--
ALTER TABLE `item_suitability_rules`
  ADD PRIMARY KEY (`rule_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `master_items`
--
ALTER TABLE `master_items`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `matches`
--
ALTER TABLE `matches`
  ADD PRIMARY KEY (`match_id`),
  ADD KEY `season_id` (`season_id`),
  ADD KEY `team_a_id` (`team_a_id`),
  ADD KEY `team_b_id` (`team_b_id`),
  ADD KEY `winner_team_id` (`winner_team_id`);

--
-- Indexes for table `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`player_id`);

--
-- Indexes for table `player_transfers`
--
ALTER TABLE `player_transfers`
  ADD PRIMARY KEY (`transfer_id`),
  ADD KEY `player_id` (`player_id`),
  ADD KEY `from_team_id` (`from_team_id`),
  ADD KEY `to_team_id` (`to_team_id`),
  ADD KEY `season_id` (`season_id`);

--
-- Indexes for table `recommended_builds`
--
ALTER TABLE `recommended_builds`
  ADD PRIMARY KEY (`build_rec_id`),
  ADD KEY `hero_id` (`hero_id`);

--
-- Indexes for table `recommended_build_items`
--
ALTER TABLE `recommended_build_items`
  ADD PRIMARY KEY (`rec_item_id`),
  ADD KEY `build_rec_id` (`build_rec_id`),
  ADD KEY `item_id` (`item_id`);

--
-- Indexes for table `scraping_logs`
--
ALTER TABLE `scraping_logs`
  ADD PRIMARY KEY (`log_id`);

--
-- Indexes for table `seasons`
--
ALTER TABLE `seasons`
  ADD PRIMARY KEY (`season_id`);

--
-- Indexes for table `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`team_id`);

--
-- Indexes for table `team_rosters`
--
ALTER TABLE `team_rosters`
  ADD PRIMARY KEY (`roster_id`),
  ADD KEY `team_id` (`team_id`),
  ADD KEY `player_id` (`player_id`),
  ADD KEY `season_id` (`season_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `games`
--
ALTER TABLE `games`
  MODIFY `game_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `game_drafts`
--
ALTER TABLE `game_drafts`
  MODIFY `draft_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `game_item_builds`
--
ALTER TABLE `game_item_builds`
  MODIFY `build_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `game_player_stats`
--
ALTER TABLE `game_player_stats`
  MODIFY `stat_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `game_timelines`
--
ALTER TABLE `game_timelines`
  MODIFY `timeline_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `heroes`
--
ALTER TABLE `heroes`
  MODIFY `hero_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=103;

--
-- AUTO_INCREMENT for table `hero_attributes`
--
ALTER TABLE `hero_attributes`
  MODIFY `attribute_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `item_suitability_rules`
--
ALTER TABLE `item_suitability_rules`
  MODIFY `rule_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `master_items`
--
ALTER TABLE `master_items`
  MODIFY `item_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `matches`
--
ALTER TABLE `matches`
  MODIFY `match_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=502;

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `player_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `player_transfers`
--
ALTER TABLE `player_transfers`
  MODIFY `transfer_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recommended_builds`
--
ALTER TABLE `recommended_builds`
  MODIFY `build_rec_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recommended_build_items`
--
ALTER TABLE `recommended_build_items`
  MODIFY `rec_item_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `scraping_logs`
--
ALTER TABLE `scraping_logs`
  MODIFY `log_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `seasons`
--
ALTER TABLE `seasons`
  MODIFY `season_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `teams`
--
ALTER TABLE `teams`
  MODIFY `team_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `team_rosters`
--
ALTER TABLE `team_rosters`
  MODIFY `roster_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `games`
--
ALTER TABLE `games`
  ADD CONSTRAINT `games_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`match_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `games_ibfk_2` FOREIGN KEY (`red_team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `games_ibfk_3` FOREIGN KEY (`blue_team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `games_ibfk_4` FOREIGN KEY (`winner_team_id`) REFERENCES `teams` (`team_id`) ON DELETE SET NULL;

--
-- Constraints for table `game_drafts`
--
ALTER TABLE `game_drafts`
  ADD CONSTRAINT `game_drafts_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_drafts_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_drafts_ibfk_3` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`hero_id`) ON DELETE CASCADE;

--
-- Constraints for table `game_item_builds`
--
ALTER TABLE `game_item_builds`
  ADD CONSTRAINT `game_item_builds_ibfk_1` FOREIGN KEY (`stat_id`) REFERENCES `game_player_stats` (`stat_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_item_builds_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `master_items` (`item_id`) ON DELETE CASCADE;

--
-- Constraints for table `game_player_stats`
--
ALTER TABLE `game_player_stats`
  ADD CONSTRAINT `game_player_stats_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_player_stats_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `game_player_stats_ibfk_3` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`hero_id`) ON DELETE CASCADE;

--
-- Constraints for table `game_timelines`
--
ALTER TABLE `game_timelines`
  ADD CONSTRAINT `game_timelines_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE;

--
-- Constraints for table `hero_attributes`
--
ALTER TABLE `hero_attributes`
  ADD CONSTRAINT `hero_attributes_ibfk_1` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`hero_id`) ON DELETE CASCADE;

--
-- Constraints for table `item_suitability_rules`
--
ALTER TABLE `item_suitability_rules`
  ADD CONSTRAINT `item_suitability_rules_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `master_items` (`item_id`) ON DELETE CASCADE;

--
-- Constraints for table `matches`
--
ALTER TABLE `matches`
  ADD CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`team_a_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`team_b_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `matches_ibfk_4` FOREIGN KEY (`winner_team_id`) REFERENCES `teams` (`team_id`) ON DELETE SET NULL;

--
-- Constraints for table `player_transfers`
--
ALTER TABLE `player_transfers`
  ADD CONSTRAINT `player_transfers_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `player_transfers_ibfk_2` FOREIGN KEY (`from_team_id`) REFERENCES `teams` (`team_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `player_transfers_ibfk_3` FOREIGN KEY (`to_team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `player_transfers_ibfk_4` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE;

--
-- Constraints for table `recommended_builds`
--
ALTER TABLE `recommended_builds`
  ADD CONSTRAINT `recommended_builds_ibfk_1` FOREIGN KEY (`hero_id`) REFERENCES `heroes` (`hero_id`) ON DELETE CASCADE;

--
-- Constraints for table `recommended_build_items`
--
ALTER TABLE `recommended_build_items`
  ADD CONSTRAINT `recommended_build_items_ibfk_1` FOREIGN KEY (`build_rec_id`) REFERENCES `recommended_builds` (`build_rec_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `recommended_build_items_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `master_items` (`item_id`) ON DELETE CASCADE;

--
-- Constraints for table `team_rosters`
--
ALTER TABLE `team_rosters`
  ADD CONSTRAINT `team_rosters_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `team_rosters_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `team_rosters_ibfk_3` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
