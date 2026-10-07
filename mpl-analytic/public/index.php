<?php

// declare(strict_types=1);

// header('Access-Control-Allow-Origin: *');
// header('Access-Control-Allow-Headers: Content-Type, Authorization');
// header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
//     http_response_code(204);
//     exit;
// }

// require_once dirname(__DIR__) . '/routes/api.php';



// public/index.php

// 1. Inisialisasi Koneksi Database PDO
try {
    $host = 'localhost';
    $dbname = 'mpl_analytic'; // Sesuaikan nama database Anda
    $username = 'root';
    $password = ''; // Sesuaikan password database Anda
    
    $db = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        "success" => false, 
        "message" => "Database Connection Failed: " . $e->getMessage()
    ]);
    exit;
}

// 2. Tangkap URL
if (isset($_GET['url'])) {
    $uri = trim($_GET['url'], '/');
} else {
    $requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $baseFolder = '/menpro/manajemen-proyek-kelompok-4/mpl-analytic/public';
    $uri = str_replace($baseFolder, '', $requestUri);
    $uri = trim($uri, '/');
}

$segments = explode('/', $uri);

// 3. Panggil router (variabel $db otomatis tersedia di dalam routes/api.php)
require_once __DIR__ . '/../routes/api.php';