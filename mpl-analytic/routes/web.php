<?php
require_once dirname(__DIR__) . '/app/helpers/response.php';

$path = parse_url(
    $_SERVER['REQUEST_URI'] ?? '/',
    PHP_URL_PATH
) ?: '/';

// Deteksi script directory secara dinamis
$scriptDir = defined('BASE_URL') ? BASE_URL : rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($scriptDir === '.') {
    $scriptDir = '';
}

if ($scriptDir !== '' && str_starts_with($path, $scriptDir)) {
    $path = substr($path, strlen($scriptDir));
} else {
    $fallbackBases = [
        '/manajemen-proyek-kelompok-4/mpl-analytic/public',
        '/manajemen-proyek-kelompok-4',
        '/mpl-analytic/public',
    ];
    foreach ($fallbackBases as $fb) {
        if (str_starts_with($path, $fb)) {
            $path = substr($path, strlen($fb));
            break;
        }
    }
}

$path = '/' . trim($path, '/');

$routes = [
    '/' => BASE_PATH . '/views/pages/home.php',
    '/dashboard' => BASE_PATH . '/views/pages/dashboard.php',
    '/meta' => BASE_PATH . '/views/pages/meta.php',
    '/hero' => BASE_PATH . '/views/pages/hero-detail.php',
    '/tournament' => BASE_PATH . '/views/pages/tournament.php',
    '/player-comparison' =>
        BASE_PATH . '/views/pages/player-comparison.php',
];

if (isset($routes[$path]) && file_exists($routes[$path])) {
    require $routes[$path];
    exit;
}

http_response_code(404);

$errorPage = BASE_PATH . '/views/errors/404.php';

if (file_exists($errorPage)) {
    require $errorPage;
} else {
    echo 'Halaman tidak ditemukan.';
}
 
?>
