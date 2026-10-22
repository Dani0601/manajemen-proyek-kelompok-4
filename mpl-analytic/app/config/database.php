<?php

class Database
{
    private static ?PDO $connection = null;

    public static function connect(): PDO
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $env = self::loadEnv();

        $host = trim($env['DB_HOST'] ?? '127.0.0.1');
        $port = trim($env['DB_PORT'] ?? '3306');
        $name = trim($env['DB_NAME'] ?? $env['DB_DATABASE'] ?? 'mpl_analytic');
        $user = trim($env['DB_USER'] ?? $env['DB_USERNAME'] ?? 'root');
        $pass = trim($env['DB_PASS'] ?? $env['DB_PASSWORD'] ?? '');

        // Jika host mengandung format host:port (misal sqlxxx.infinityfree.com:3306)
        if (str_contains($host, ':')) {
            [$hostOnly, $customPort] = explode(':', $host, 2);
            $host = $hostOnly;
            if (!empty($customPort)) {
                $port = $customPort;
            }
        }

        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        self::$connection = new PDO(
            $dsn,
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 7,
            ]
        );

        return self::$connection;
    }

    private static function loadEnv(): array
    {
        $possiblePaths = [
            dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env',
            dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . '.env',
            rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/\\') . DIRECTORY_SEPARATOR . '.env',
            rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/\\') . DIRECTORY_SEPARATOR . 'mpl-analytic' . DIRECTORY_SEPARATOR . '.env',
        ];

        $envPath = null;
        foreach ($possiblePaths as $p) {
            if ($p !== '' && file_exists($p)) {
                $envPath = $p;
                break;
            }
        }

        if ($envPath === null) {
            return [];
        }

        $variables = [];

        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            if (!str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);

            $key = trim($key);
            $value = trim($value);

            $value = trim($value, "\"'");

            $variables[$key] = $value;
        }

        return $variables;
    }
}