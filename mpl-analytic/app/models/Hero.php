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

        return $stmt->fetchAll();
    }

    public function getBuildSpells(int $heroId): array
    {
        $sql = "
            SELECT
                hero_build_spell_id,
                spell_name,
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

        return $stmt->fetchAll();
    }

    public function getBuildTalents(int $heroId): array
    {
        $sql = "
            SELECT
                hero_build_talent_id,
                position,
                talent_name,
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

        return $stmt->fetchAll();
    }

    public function getSituationalSwaps(int $heroId): array
    {
        $sql = "
            SELECT
                hero_build_swap_id,
                condition_text,
                item_name,
                share_percent,
                snapshot_at
            FROM hero_build_situational_swaps
            WHERE hero_id = :hero_id
            ORDER BY share_percent DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function getSkills(int $heroId): array
    {
        $sql = "
            SELECT
                hero_skill_id,
                skill_position,
                skill_type,
                skill_name,
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
}