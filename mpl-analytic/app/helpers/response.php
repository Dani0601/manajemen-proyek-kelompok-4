<?php

function jsonResponse(
    mixed $data = null,
    string $message = 'Data berhasil diambil.',
    int $statusCode = 200,
    array $extra = []
): never {
    http_response_code($statusCode);

    header('Content-Type: application/json; charset=utf-8');

    $response = [
        'success' => $statusCode >= 200 && $statusCode < 300,
        'message' => $message,
        'data' => $data,
    ];

    if (!empty($extra)) {
        $response = array_merge($response, $extra);
    }

    echo json_encode(
        $response,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES |
        JSON_PRETTY_PRINT
    );

    exit;
}