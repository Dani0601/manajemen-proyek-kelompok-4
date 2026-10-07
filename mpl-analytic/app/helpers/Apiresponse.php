<?php
class ApiResponse {
    public static function send($data = null, $message = '', $statusCode = 200, $extra = []) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        $response = [
            'status'  => ($statusCode >= 200 && $statusCode < 300) ? 'success' : 'error',
            'code'    => $statusCode,
            'message' => $message,
            'data'    => $data,
        ];

        if (!empty($extra)) {
            $response = array_merge($response, $extra);
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        exit;
    }

    // Shortcut untuk sukses
    public static function success($data, $message = 'Success') {
        self::send($data, $message, 200);
    }

    // Shortcut untuk error
    public static function error($message, $statusCode = 400) {
        self::send(null, $message, $statusCode);
    }
}