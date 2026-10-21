
<?php
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);
define('BASE_PATH', dirname(__DIR__));

define(
    'ASSET_BASE',
    rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/') . '/assets'
);


$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

$basePath = '/manajemen-proyek-kelompok-4/mpl-analytic/public';
if (str_starts_with($requestPath, $basePath)) {
    $requestPath = substr($requestPath, strlen($basePath));
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
                'code' => 'DATABASE_CONNECTION_ERROR'
            ]
        ]);

        exit;
    }

    require BASE_PATH . '/routes/api.php';
    exit;
}

require BASE_PATH . '/routes/web.php';

?>