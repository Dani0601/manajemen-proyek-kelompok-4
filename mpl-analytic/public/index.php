<?php

declare(strict_types=1);

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// 1. Inisialisasi Koneksi Database
try {
    require_once dirname(__DIR__) . '/app/config/database.php';
    $db = Database::connect();
} catch (Throwable $e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Database Connection Failed: ' . $e->getMessage()
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

// 2. Tangkap URL & Bersihkan Base Path
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

$basePaths = [
    '/manajemen-proyek-kelompok-4/mpl-analytic/public',
    '/manajemen-proyek-kelompok-4',
    '/mpl-analytic/public',
];

$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
if ($scriptDir !== '/' && $scriptDir !== '' && str_starts_with($requestUri, $scriptDir)) {
    $uri = substr($requestUri, strlen($scriptDir));
} else {
    $uri = $requestUri;
    foreach ($basePaths as $basePath) {
        if (str_starts_with($uri, $basePath)) {
            $uri = substr($uri, strlen($basePath));
            break;
        }
    }
}

$uri = trim($uri, '/');
$segments = $uri === '' ? [] : explode('/', $uri);

// 3. Panggil router
require_once dirname(__DIR__) . '/routes/api.php';