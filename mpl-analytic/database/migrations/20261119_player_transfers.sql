-- Migration: Tambah tabel player_transfers untuk Card 15.1
-- Riwayat transfer pemain MPL Indonesia Season 18
-- Jalankan di phpMyAdmin atau MySQL CLI:
-- mysql -u root -p mpl_analytic < 20261119_player_transfers.sql

CREATE TABLE IF NOT EXISTS `player_transfers` (
  `transfer_id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `player_id`        INT UNSIGNED DEFAULT NULL,
  `player_name`      VARCHAR(150) NOT NULL COMMENT 'Nama pemain dari Liquipedia (fallback jika tidak ada di tabel players)',
  `player_photo_url` VARCHAR(500) NOT NULL DEFAULT '',
  `from_team_id`     INT UNSIGNED DEFAULT NULL,
  `from_team_name`   VARCHAR(150) NOT NULL COMMENT 'Nama tim asal (dari scraping)',
  `to_team_id`       INT UNSIGNED DEFAULT NULL,
  `to_team_name`     VARCHAR(150) NOT NULL COMMENT 'Nama tim tujuan (dari scraping)',
  `transfer_type`    ENUM('buyout', 'loan', 'free_transfer', 'unknown') NOT NULL DEFAULT 'unknown'
                     COMMENT 'Jenis transfer: buyout (dibeli putus), loan (pinjaman), free_transfer (kontrak habis/bebas)',
  `transfer_date`    DATE DEFAULT NULL COMMENT 'Tanggal efektif transfer',
  `season_id`        INT UNSIGNED DEFAULT NULL COMMENT 'Musim saat transfer terjadi (opsional)',
  `liquipedia_ref`   VARCHAR(500) DEFAULT NULL COMMENT 'URL sumber Liquipedia',
  `scraped_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu scraping terakhir',
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`transfer_id`),
  UNIQUE KEY `uq_player_transfers` (`player_name`, `from_team_name`, `to_team_name`, `transfer_date`),
  KEY `idx_pt_player_id`    (`player_id`),
  KEY `idx_pt_from_team`    (`from_team_id`),
  KEY `idx_pt_to_team`      (`to_team_id`),
  KEY `idx_pt_season`       (`season_id`),
  KEY `idx_pt_transfer_type`(`transfer_type`),
  KEY `idx_pt_transfer_date`(`transfer_date`),

  CONSTRAINT `fk_pt_player`    FOREIGN KEY (`player_id`)    REFERENCES `players` (`player_id`)  ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pt_from_team` FOREIGN KEY (`from_team_id`) REFERENCES `teams`   (`team_id`)    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pt_to_team`   FOREIGN KEY (`to_team_id`)   REFERENCES `teams`   (`team_id`)    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pt_season`    FOREIGN KEY (`season_id`)    REFERENCES `seasons`  (`season_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Riwayat transfer pemain profesional MPL Indonesia (di-scrape dari Liquipedia)';

