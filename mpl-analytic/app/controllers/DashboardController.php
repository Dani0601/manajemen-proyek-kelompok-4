<?php

require_once dirname(__DIR__) . '/services/DashboardService.php';
require_once dirname(__DIR__) . '/helpers/response.php';

class DashboardController
{
    private DashboardService $service;

    public function __construct()
    {
        $this->service = new DashboardService();
    }

    public function index(): never
    {
        $data = $this->service->getDashboard();

        if ($data === null) {
            jsonResponse(
                null,
                'Season tidak ditemukan.',
                404,
                [
                    'error' => [
                        'code' => 'SEASON_NOT_FOUND'
                    ]
                ]
            );
        }

        jsonResponse(
            $data,
            'Data dashboard berhasil diambil.'
        );
    }
}