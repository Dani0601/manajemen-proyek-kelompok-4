<?php
// Menyediakan spesifikasi OpenAPI yang disimpan di luar document root.
// Dengan begitu file docs/openapi.yaml tidak perlu dipindahkan ke folder public.
$specPath = dirname(__DIR__) . '/docs/openapi.yaml';

if (!is_file($specPath) || !is_readable($specPath)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'OpenAPI specification not found.';
    exit;
}

header('Content-Type: application/yaml; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-cache, must-revalidate');
readfile($specPath);
