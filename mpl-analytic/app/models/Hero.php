<?php
class Hero
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function all(): array
    {
        $sql = "
            SELECT
                hero_id,
                hero_name,
                role,
                hero_slug,
                hero_url,
                created_at,
                updated_at
            FROM heroes
            ORDER BY hero_name ASC
        ";

        return $this->db
            ->query($sql)
            ->fetchAll();
    }

    public function findById(int $heroId): ?array
    {
        $sql = "
            SELECT
                hero_id,
                hero_name,
                role,
                hero_slug,
                hero_url,
                created_at,
                updated_at
            FROM heroes
            WHERE hero_id = :hero_id
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch();

        return $result ?: null;
    }

    public function getDetail(int $heroId): ?array
    {
        $sql = "
            SELECT
                hero_detail_id,
                source_hero_id,
                hero_id,
                hero_name,
                hero_url,
                win_rate,
                pick_rate,
                ban_rate,
                win_rate_epic,
                win_rate_legend,
                win_rate_mythic,
                win_rate_mythical_honor,
                win_rate_mythical_glory_plus,
                offense,
                durability,
                control_effects,
                difficulty,
                hero_info_json,
                base_stats_json,
                source_url,
                snapshot_at
            FROM hero_details
            WHERE hero_id = :hero_id
            ORDER BY snapshot_at DESC
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch();

        return $result ?: null;
    }

    public function getStats(int $heroId): ?array
    {
        $sql = "
            SELECT
                hero_detail_id,
                hero_id,
                hero_name,
                win_rate,
                pick_rate,
                ban_rate,
                win_rate_epic,
                win_rate_legend,
                win_rate_mythic,
                win_rate_mythical_honor,
                win_rate_mythical_glory_plus,
                snapshot_at,
                source_url
            FROM hero_details
            WHERE hero_id = :hero_id
            ORDER BY snapshot_at DESC
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch();

        return $result ?: null;
    }

    public function getCounters(
        int $heroId,
        string $relationType = 'counter'
    ): array {
        $sql = "
            SELECT
                hero_counter_id,
                source_hero_id,
                hero_id,
                relation_type,
                target_source_hero_id,
                target_hero_id,
                target_hero_name,
                target_hero_url,
                win_rate_advantage,
                snapshot_at
            FROM hero_counters
            WHERE hero_id = :hero_id
              AND relation_type = :relation_type
            ORDER BY win_rate_advantage DESC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(
            ':hero_id',
            $heroId,
            PDO::PARAM_INT
        );

        $stmt->bindValue(
            ':relation_type',
            $relationType,
            PDO::PARAM_STR
        );

        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getBuildItems(int $heroId): array
    {
        $sql = "
            SELECT
                hero_build_item_id,
                position,
                item_source_id,
                item_name,
                item_url,
                build_count,
                total_builds,
                share_percent,
                power_spike,
                snapshot_at
            FROM hero_build_items
            WHERE hero_id = :hero_id
            ORDER BY position ASC, share_percent DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getBuildEmblems(int $heroId): array
    {
        $sql = "
            SELECT
                hero_build_emblem_id,
                emblem_name,
                emblem_icon_url,
                build_count,
                total_builds,
                snapshot_at
            FROM hero_build_emblems
            WHERE hero_id = :hero_id
            ORDER BY build_count DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            if (!isset($row['emblem_url']) && isset($row['emblem_icon_url'])) {
                $row['emblem_url'] = $row['emblem_icon_url'];
            }
        }
        return $rows;
    }

    public function getBuildSpells(int $heroId): array
    {
        $sql = "
            SELECT
                hero_build_spell_id,
                spell_name,
                spell_icon_url,
                share_percent,
                build_count,
                snapshot_at
            FROM hero_build_spells
            WHERE hero_id = :hero_id
            ORDER BY share_percent DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            if (!isset($row['spell_url']) && isset($row['spell_icon_url'])) {
                $row['spell_url'] = $row['spell_icon_url'];
            }
        }
        unset($row);
        return $rows;
    }

    public function getBuildTalents(int $heroId): array
    {
        $sql = "
            SELECT
                hero_build_talent_id,
                position,
                talent_name,
                talent_icon_url,
                build_count,
                total_builds,
                snapshot_at
            FROM hero_build_talents
            WHERE hero_id = :hero_id
            ORDER BY position ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            if (!isset($row['talent_url']) && isset($row['talent_icon_url'])) {
                $row['talent_url'] = $row['talent_icon_url'];
            }
        }
        return $rows;
    }

    public function getSituationalSwaps(int $heroId): array
    {
        $sql = "
            SELECT
                s.hero_build_swap_id,
                s.condition_text,
                s.item_name,
                s.share_percent,
                s.snapshot_at,
                mi.item_url
            FROM hero_build_situational_swaps s
            LEFT JOIN master_items mi
                ON LOWER(mi.item_name) = LOWER(s.item_name)
            WHERE s.hero_id = :hero_id
            ORDER BY s.share_percent DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['item_icon_url'] = $row['item_url'] ?? null;
        }
        unset($row);
        return $rows;
    }

    /** Source-backed situational item rules for this hero. */
    public function getSituationalRecommendations(int $heroId): array
    {
        $sql = "
            SELECT
                r.rule_id,
                r.item_name,
                r.condition_key,
                r.condition_text,
                r.share_percent,
                r.reason,
                r.snapshot_at,
                mi.item_url
            FROM item_suitability_rules r
            LEFT JOIN master_items mi
                ON LOWER(mi.item_name) = LOWER(r.item_name)
            WHERE r.hero_id = :hero_id AND r.is_active = 1
            ORDER BY r.share_percent DESC, r.item_name ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            // No enemy-composition input exists in API Contract v1 in this repository.
            // Keep the status honest: these are situational options, not a confirmed match.
            $row['suitability_status'] = 'situational';
            $row['item_icon_url']      = $row['item_url'] ?? null;
            unset($row['rule_id']);
        }
        unset($row);

        return $rows;
    }

    /** Clean emblem names from the source's scraped guide text and preserve source counts. */
    public function getEmblemRecommendations(int $heroId): array
    {
        $sql = "
            SELECT emblem_name, emblem_icon_url, build_count, total_builds, snapshot_at
            FROM hero_build_emblems
            WHERE hero_id = :hero_id
            ORDER BY build_count DESC, total_builds DESC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $recommendations = [];
        foreach ($rows as $row) {
            $rawName = (string) ($row['emblem_name'] ?? '');
            if (preg_match('/\bEMBLEM\s+([A-Za-z][A-Za-z -]*)\s*$/i', $rawName, $matches)) {
                $name = trim($matches[1]);
            } else {
                // Keep legitimate source text instead of fabricating a normalized name.
                $name = trim($rawName);
            }
            if ($name === '') {
                continue;
            }
            $iconUrl = $row['emblem_icon_url'] ?? null;
            $recommendations[] = [
                'name' => $name,
                'emblem_icon_url' => $iconUrl,
                'emblem_url' => $iconUrl,
                'suitability_status' => 'popular_in_build_data',
                'reason' => 'Emblem ini tercatat pada data build hero; jumlah penggunaan yang tersedia ditampilkan sebagai konteks.',
                'build_count' => isset($row['build_count']) ? (int) $row['build_count'] : null,
                'total_builds' => isset($row['total_builds']) ? (int) $row['total_builds'] : null,
                'snapshot_at' => $row['snapshot_at'] ?? null,
            ];
        }

        return $recommendations;
    }

    public function getSkills(int $heroId): array
    {
        $sql = "
            SELECT
                hero_skill_id,
                skill_position,
                skill_type,
                skill_name,
                skill_icon_url,
                description,
                tags_json,
                snapshot_at
            FROM hero_skills
            WHERE hero_id = :hero_id
            ORDER BY skill_position ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();

        foreach ($rows as &$row) {
            if (!empty($row['tags_json'])) {
                $row['tags'] = json_decode(
                    $row['tags_json'],
                    true
                );
            } else {
                $row['tags'] = [];
            }

            unset($row['tags_json']);
        }

        return $rows;
    }

    public function getSkillOrders(int $heroId): array
    {
        $sql = "
            SELECT
                hero_skill_order_id,
                position,
                skill_name,
                priority,
                snapshot_at
            FROM hero_skill_orders
            WHERE hero_id = :hero_id
            ORDER BY position ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * Search heroes by name keyword and/or filter by role.
     * Supports single role ('mage') or comma-separated roles ('mage,support').
     */
    public function search(string $query = '', string $role = ''): array
    {
        $query = trim($query);
        $role  = trim($role);

        $hasQuery = $query !== '';
        $hasRole  = $role !== '';

        if (!$hasQuery && !$hasRole) {
            return $this->all();
        }

        $conditions = [];
        $params     = [];

        if ($hasQuery) {
            $conditions[] = 'h.hero_name LIKE :query';
            $params[':query'] = '%' . $query . '%';
        }

        if ($hasRole) {
            $roles = array_values(array_filter(array_map('trim', explode(',', strtolower($role)))));
            if (count($roles) === 1) {
                $conditions[] = 'LOWER(h.role) = :role';
                $params[':role'] = $roles[0];
            } elseif (count($roles) > 1) {
                $placeholders = [];
                foreach ($roles as $idx => $r) {
                    $ph = ':role_' . $idx;
                    $placeholders[] = $ph;
                    $params[$ph] = $r;
                }
                $conditions[] = 'LOWER(h.role) IN (' . implode(', ', $placeholders) . ')';
            }
        }

        $whereClause = 'WHERE ' . implode(' AND ', $conditions);

        $sql = "
            SELECT
                h.hero_id,
                h.hero_name,
                h.role,
                h.hero_slug,
                h.hero_url,
                h.created_at,
                h.updated_at
            FROM heroes h
            {$whereClause}
            ORDER BY h.hero_name ASC
        ";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, PDO::PARAM_STR);
        }
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
