
<?php


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
    require BASE_PATH . '/routes/api.php';
    exit;
}

require BASE_PATH . '/routes/web.php';

?>