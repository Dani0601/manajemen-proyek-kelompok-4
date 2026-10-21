<?php
require_once 'mpl-analytic/app/config/database.php';
$db = Database::connect();
$stmt = $db->query('SELECT game_id FROM games LIMIT 3');
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
