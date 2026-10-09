<?php

require_once dirname(__DIR__) . '/config/database.php';

class Dashboard
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /**
     * =========================================================
     * CURRENT SEASON
     * =========================================================
     */
    public function getCurrentSeason(): ?array
    {
        $sql = "
            SELECT
                season_id,
                league,
                season_number,
                phase,
                start_date,
                end_date,
                format,
                source

            FROM seasons

            ORDER BY
                season_number DESC,
                start_date DESC

            LIMIT 1
        ";

        $stmt = $this->db->query($sql);

        $season = $stmt->fetch();

        return $season ?: null;
    }

    /**
     * =========================================================
     * CURRENT WEEK
     *
     * Mengambil week terakhir yang tanggal pertandingannya
     * sudah mencapai hari ini.
     *
     * Contoh:
     *
     * Week 1 -> 2026-03-27
     * Week 2 -> 2026-04-03
     * Week 3 -> 2026-04-10
     *
     * Jika hari ini berada di Week 2,
     * maka current_week = 2.
     * =========================================================
     */
    public function getCurrentWeek(int $seasonId): ?int
    {
        $sql = "
            SELECT
                MAX(week) AS current_week

            FROM schedules

            WHERE
                season_id = :season_id
                AND match_date <= CURDATE()
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(
            ':season_id',
            $seasonId,
            PDO::PARAM_INT
        );

        $stmt->execute();

        $result = $stmt->fetch();

        if (
            !$result ||
            $result['current_week'] === null
        ) {
            return null;
        }

        return (int) $result['current_week'];
    }

    /**
     * =========================================================
     * HERO META
     *
     * Sumber:
     *
     * Pick Count / Pick Rate
     * -> hero_season_stats
     *
     * Win Rate / Ban Rate
     * -> hero_details
     *
     * Method ini mengambil semua hero.
     * Ranking Top 5 menggunakan method terpisah.
     * =========================================================
     */
    public function getHeroMeta(int $seasonId): array
    {
        $sql = "
            SELECT
                h.hero_id,
                h.hero_name,
                h.hero_slug,
                h.hero_url,

                hss.pick_count,
                hss.pick_rate,

                hd.win_rate,
                hd.ban_rate

            FROM hero_season_stats hss

            INNER JOIN heroes h
                ON h.hero_id = hss.hero_id

            LEFT JOIN hero_details hd
                ON hd.hero_id = h.hero_id

            WHERE
                hss.season_id = :season_id

            ORDER BY
                hss.pick_rate DESC,
                h.hero_name ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(
            ':season_id',
            $seasonId,
            PDO::PARAM_INT
        );

        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * =========================================================
     * TOP 5 PICK RATE
     * =========================================================
     */
    public function getTopPickRate(
        int $seasonId,
        int $limit = 5
    ): array {
        $sql = "
            SELECT
                h.hero_id,
                h.hero_name,

                hss.pick_count,
                hss.pick_rate,

                hd.win_rate,
                hd.ban_rate

            FROM hero_season_stats hss

            INNER JOIN heroes h
                ON h.hero_id = hss.hero_id

            LEFT JOIN hero_details hd
                ON hd.hero_id = h.hero_id

            WHERE
                hss.season_id = :season_id

            ORDER BY
                hss.pick_rate DESC,
                hss.pick_count DESC,
                h.hero_name ASC

            LIMIT :limit
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(
            ':season_id',
            $seasonId,
            PDO::PARAM_INT
        );

        $stmt->bindValue(
            ':limit',
            $limit,
            PDO::PARAM_INT
        );

        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * =========================================================
     * TOP 5 WIN RATE
     * =========================================================
     */
    public function getTopWinRate(
        int $seasonId,
        int $limit = 5
    ): array {
        $sql = "
            SELECT
                h.hero_id,
                h.hero_name,

                hss.pick_count,
                hss.pick_rate,

                hd.win_rate,
                hd.ban_rate

            FROM hero_season_stats hss

            INNER JOIN heroes h
                ON h.hero_id = hss.hero_id

            INNER JOIN hero_details hd
                ON hd.hero_id = h.hero_id

            WHERE
                hss.season_id = :season_id
                AND hd.win_rate IS NOT NULL

            ORDER BY
                hd.win_rate DESC,
                hss.pick_count DESC,
                h.hero_name ASC

            LIMIT :limit
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(
            ':season_id',
            $seasonId,
            PDO::PARAM_INT
        );

        $stmt->bindValue(
            ':limit',
            $limit,
            PDO::PARAM_INT
        );

        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * =========================================================
     * TOP 5 BAN RATE
     * =========================================================
     */
    public function getTopBanRate(
        int $seasonId,
        int $limit = 5
    ): array {
        $sql = "
            SELECT
                h.hero_id,
                h.hero_name,

                hss.pick_count,
                hss.pick_rate,

                hd.win_rate,
                hd.ban_rate

            FROM hero_season_stats hss

            INNER JOIN heroes h
                ON h.hero_id = hss.hero_id

            INNER JOIN hero_details hd
                ON hd.hero_id = h.hero_id

            WHERE
                hss.season_id = :season_id
                AND hd.ban_rate IS NOT NULL

            ORDER BY
                hd.ban_rate DESC,
                hss.pick_count DESC,
                h.hero_name ASC

            LIMIT :limit
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(
            ':season_id',
            $seasonId,
            PDO::PARAM_INT
        );

        $stmt->bindValue(
            ':limit',
            $limit,
            PDO::PARAM_INT
        );

        $stmt->execute();

        return $stmt->fetchAll();
    }

    /**
     * =========================================================
     * SCHEDULE MINGGU INI
     *
     * Hanya mengambil schedule berdasarkan:
     *
     * season_id
     * week
     *
     * Bukan seluruh schedule season.
     * =========================================================
     */
    public function getSchedule(
        int $seasonId,
        int $week
    ): array {
        $sql = "
            SELECT
                s.schedule_id,
                s.season_id,
                s.week,

                s.match_date,
                s.match_time,

                s.team1_id,
                t1.team_name AS team1_name,

                s.team2_id,
                t2.team_name AS team2_name,

                s.status,
                s.source,
                s.source_match_id

            FROM schedules s

            LEFT JOIN teams t1
                ON t1.team_id = s.team1_id

            LEFT JOIN teams t2
                ON t2.team_id = s.team2_id

            WHERE
                s.season_id = :season_id
                AND s.week = :week

            ORDER BY
                s.match_date ASC,
                s.match_time ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->bindValue(
            ':season_id',
            $seasonId,
            PDO::PARAM_INT
        );

        $stmt->bindValue(
            ':week',
            $week,
            PDO::PARAM_INT
        );

        $stmt->execute();

        return $stmt->fetchAll();
    }
    public function getLastWeek(int $seasonId): ?int
{
    $sql = "
        SELECT
            MAX(week) AS last_week
        FROM schedules
        WHERE season_id = :season_id
    ";

    $stmt = $this->db->prepare($sql);

    $stmt->bindValue(
        ':season_id',
        $seasonId,
        PDO::PARAM_INT
    );

    $stmt->execute();

    $result = $stmt->fetch();

    if (
        !$result ||
        $result['last_week'] === null
    ) {
        return null;
    }

    return (int) $result['last_week'];
}
}