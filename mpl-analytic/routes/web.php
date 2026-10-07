<?php

require_once dirname(__DIR__) . '/app/helpers/response.php';

jsonResponse(
    null,
    'Web route belum tersedia.',
    404,
    [
        'error' => [
            'code' => 'WEB_ROUTE_NOT_FOUND'
        ]
    ]
);