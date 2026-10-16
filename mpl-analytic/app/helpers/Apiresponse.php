<?php

namespace App\Helpers; // Sesuaikan namespace dengan struktur folder Anda

class ApiResponse
{
    /**
     * Format response untuk request yang berhasil (Success)
     *
     * @param mixed $data Data yang ingin dikirimkan (array/object/string)
     * @param string $message Pesan sukses
     * @param int $statusCode HTTP Status Code (default: 200 OK)
     * @return void
     */
    public static function success($data = null, $message = 'Operation successful', $statusCode = 200)
    {
        $response = [
            'success' => true,
            'message' => $message,
            'data'    => $data
        ];

        self::send($response, $statusCode);
    }

    /**
     * Format response untuk request yang gagal (Error)
     *
     * @param string $message Pesan error
     * @param int $statusCode HTTP Status Code (default: 400 Bad Request)
     * @param mixed $errors Detail error tambahan (misal: error validasi form)
     * @return void
     */
    public static function error($message = 'An error occurred', $statusCode = 400, $errors = null)
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        self::send($response, $statusCode);
    }

    /**
     * Fungsi utama untuk mencetak output JSON
     *
     * @param array $data Array yang akan diubah menjadi JSON
     * @param int $statusCode HTTP Status Code
     * @return void
     */
    private static function send($data, $statusCode)
    {
        // Set HTTP status code
        http_response_code($statusCode);
        
        // Pastikan header di-set ke format JSON
        header('Content-Type: application/json; charset=utf-8');
        
        // Cetak data dalam bentuk JSON
        echo json_encode($data);
        
        // Hentikan eksekusi script setelah response dikirim
        exit;
    }
}