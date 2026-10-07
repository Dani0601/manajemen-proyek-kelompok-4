<?php

function validatePositiveInteger(
    mixed $value,
    string $field = 'id'
): int {
    if ($value === null || $value === '') {
        jsonResponse(
            null,
            "{$field} wajib diisi.",
            400,
            [
                'error' => [
                    'code' => 'VALIDATION_ERROR'
                ]
            ]
        );
    }

    if (!filter_var($value, FILTER_VALIDATE_INT)) {
        jsonResponse(
            null,
            "{$field} harus berupa angka.",
            400,
            [
                'error' => [
                    'code' => 'INVALID_INTEGER'
                ]
            ]
        );
    }

    $value = (int) $value;

    if ($value <= 0) {
        jsonResponse(
            null,
            "{$field} harus lebih besar dari 0.",
            400,
            [
                'error' => [
                    'code' => 'INVALID_VALUE'
                ]
            ]
        );
    }

    return $value;
}