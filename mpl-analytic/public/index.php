
<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
if (!defined('BASE_PATH')) {
    define('BASE_PATH', dirname(__DIR__));
}

// Deteksi base URL secara dinamis (mendukung localhost Laragon, subfolder, maupun domain langsung di hosting)
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir === '.') {
    $scriptDir = '';
}

if (!defined('BASE_URL')) {
    define('BASE_URL', $scriptDir);
}

if (!defined('ASSET_BASE')) {
    define('ASSET_BASE', BASE_URL . '/assets');
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (BASE_URL !== '' && str_starts_with($requestPath, BASE_URL)) {
    $requestPath = substr($requestPath, strlen(BASE_URL));
} else {
    $fallbackBases = [
        '/manajemen-proyek-kelompok-4/mpl-analytic/public',
        '/manajemen-proyek-kelompok-4',
        '/mpl-analytic/public',
    ];
    foreach ($fallbackBases as $fb) {
        if (str_starts_with($requestPath, $fb)) {
            $requestPath = substr($requestPath, strlen($fb));
            break;
        }
    }
}

$requestPath = '/' . trim($requestPath, '/');

if ($requestPath === '/api' || str_starts_with($requestPath, '/api/')) {
    require_once BASE_PATH . '/app/config/database.php';

    try {
        $db = Database::connect();
    } catch (Throwable $e) {
        error_log('Database connection error: ' . $e->getMessage());

        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'success' => false,
            'message' => 'Koneksi database gagal.',
            'error' => [
                'code' => 'DATABASE_CONNECTION_ERROR',
                'detail' => $e->getMessage()
            ]
        ]);

        exit;
    }

    require BASE_PATH . '/routes/api.php';
    exit;
}

require BASE_PATH . '/routes/web.php';

?>