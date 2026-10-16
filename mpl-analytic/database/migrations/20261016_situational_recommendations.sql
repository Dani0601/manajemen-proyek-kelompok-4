-- Situational item/emblem recommendation data for MPL Analytic.
-- Safe to re-run on MySQL 8+: tables are created if absent and seeds are upserted.

CREATE TABLE IF NOT EXISTS hero_attributes (
    hero_id INT UNSIGNED NOT NULL,
    source_hero_id VARCHAR(150) NOT NULL,
    offense TINYINT UNSIGNED NULL,
    durability TINYINT UNSIGNED NULL,
    control_effects TINYINT UNSIGNED NULL,
    difficulty TINYINT UNSIGNED NULL,
    hero_info_json JSON NULL,
    snapshot_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (hero_id),
    KEY idx_hero_attributes_source (source_hero_id),
    CONSTRAINT fk_hero_attributes_hero FOREIGN KEY (hero_id) REFERENCES heroes (hero_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS item_suitability_rules (
    rule_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    hero_id INT UNSIGNED NULL,
    source_hero_id VARCHAR(150) NOT NULL,
    condition_key ENUM('vs_magic','vs_physical','sustain','other') NOT NULL DEFAULT 'other',
    condition_text VARCHAR(500) NULL,
    item_name VARCHAR(255) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    share_percent DECIMAL(8,4) NULL,
    source_swap_id INT UNSIGNED NULL,
    snapshot_at DATETIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (rule_id),
    UNIQUE KEY uq_item_suitability_source_swap (source_swap_id),
    KEY idx_item_suitability_hero (hero_id, is_active),
    KEY idx_item_suitability_condition (condition_key),
    CONSTRAINT fk_item_suitability_hero FOREIGN KEY (hero_id) REFERENCES heroes (hero_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Copy the currently available, source-backed hero attributes; no synthetic attribute values.
INSERT INTO hero_attributes
    (hero_id, source_hero_id, offense, durability, control_effects, difficulty, hero_info_json, snapshot_at)
SELECT hd.hero_id, hd.source_hero_id, hd.offense, hd.durability, hd.control_effects,
       hd.difficulty, hd.hero_info_json, hd.snapshot_at
FROM hero_details hd
WHERE hd.hero_id IS NOT NULL
  AND hd.snapshot_at = (
      SELECT MAX(hd2.snapshot_at) FROM hero_details hd2 WHERE hd2.hero_id = hd.hero_id
  )
ON DUPLICATE KEY UPDATE
    source_hero_id = VALUES(source_hero_id), offense = VALUES(offense),
    durability = VALUES(durability), control_effects = VALUES(control_effects),
    difficulty = VALUES(difficulty), hero_info_json = VALUES(hero_info_json),
    snapshot_at = VALUES(snapshot_at);

-- Rules originate from scraped situational swaps. Reasons explain the recorded condition;
-- the API does not claim a rule matches an enemy composition that was not supplied.
INSERT INTO item_suitability_rules
    (hero_id, source_hero_id, condition_key, condition_text, item_name, reason,
     share_percent, source_swap_id, snapshot_at)
SELECT s.hero_id, s.source_hero_id,
       CASE
         WHEN UPPER(COALESCE(s.condition_text, '')) LIKE '%MAGIC%' THEN 'vs_magic'
         WHEN UPPER(COALESCE(s.condition_text, '')) LIKE '%PHYSICAL%' THEN 'vs_physical'
         WHEN UPPER(COALESCE(s.condition_text, '')) LIKE '%SUSTAIN%' THEN 'sustain'
         ELSE 'other'
       END,
       s.condition_text,
       CASE
         WHEN s.raw_text IS NOT NULL AND TRIM(s.raw_text) <> '' THEN
           TRIM(REGEXP_REPLACE(
             REGEXP_REPLACE(s.raw_text, '^(VS MAGIC|VS PHYSICAL|WHEN YOU NEED SUSTAIN)[[:space:]]*', ''),
             '[[:space:]]+[0-9]+([.][0-9]+)?%?$', ''
           ))
         ELSE TRIM(s.item_name)
       END,
       CASE
         WHEN UPPER(COALESCE(s.condition_text, '')) LIKE '%MAGIC%'
           THEN CONCAT('Data build situasional mencatat item ini untuk menghadapi damage magic (', s.condition_text, ').')
         WHEN UPPER(COALESCE(s.condition_text, '')) LIKE '%PHYSICAL%'
           THEN CONCAT('Data build situasional mencatat item ini untuk menghadapi damage physical (', s.condition_text, ').')
         WHEN UPPER(COALESCE(s.condition_text, '')) LIKE '%SUSTAIN%'
           THEN CONCAT('Data build situasional mencatat item ini untuk kebutuhan sustain (', s.condition_text, ').')
         ELSE CONCAT('Item ini tercatat pada build situasional hero dengan kondisi: ', COALESCE(s.condition_text, 'tidak ditentukan'), '.')
       END,
       s.share_percent, s.hero_build_swap_id, s.snapshot_at
FROM hero_build_situational_swaps s
WHERE (s.item_name IS NOT NULL AND TRIM(s.item_name) <> '')
   OR (s.raw_text IS NOT NULL AND TRIM(s.raw_text) <> '')
ON DUPLICATE KEY UPDATE
    hero_id = VALUES(hero_id), source_hero_id = VALUES(source_hero_id),
    condition_key = VALUES(condition_key), condition_text = VALUES(condition_text),
    item_name = VALUES(item_name), reason = VALUES(reason),
    share_percent = VALUES(share_percent), snapshot_at = VALUES(snapshot_at), is_active = 1;
