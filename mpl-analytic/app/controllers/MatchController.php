
<?php
require_once __DIR__ . '/../services/MatchService.php';
require_once __DIR__ . '/../helpers/response.php';

class MatchController
{
    private MatchService $matchService;

    public function __construct(PDO $db)
    {
        $this->matchService = new MatchService($db);
    }


    // GET /api/matches/{match_id}

    public function getDetail(string $matchId): never
    {
        // Validasi ID pertandingan
        if ($matchId === '') {
            jsonResponse(null, 'ID pertandingan wajib diisi.', 400, [
                'error' => [
                    'code' => 'INVALID_MATCH_ID'
                ]
            ]);
        }

        try {
            $data = $this->matchService->getMatchDetail($matchId);

            if ($data === null) {
                jsonResponse(null, 'Detail pertandingan tidak ditemukan.', 404, [
                    'error' => [
                        'code' => 'MATCH_NOT_FOUND'
                    ]
                ]);
            }

            jsonResponse($data, 'Detail pertandingan berhasil diambil.',200);
        } catch (Throwable $e) {
    error_log(
        'MatchController::getDetail - '
        . $e->getMessage()
    );

    jsonResponse(
        null,
        'Terjadi kesalahan pada server.',
        500,
        [
            'error' => [
                'code' => 'INTERNAL_SERVER_ERROR'
            ]
        ]
    );
}
    }


    // GET /api/matches/{match_id}/drafts

    public function getDrafts(string $matchId): never
    {
        if ($matchId === '') {
            jsonResponse(null, 'ID pertandingan wajib diisi.', 400, [
                'error' => [
                    'code' => 'INVALID_MATCH_ID'
                ]
            ]);
        }

        try {
            $data = $this->matchService->getMatchDrafts($matchId);

            if ($data === null) {
                jsonResponse(null, 'Riwayat draft pertandingan tidak ditemukan.', 404, [
                    'error' => [
                        'code' => 'MATCH_NOT_FOUND'
                    ]
                ]);
            }

            jsonResponse($data, 'Riwayat draft pertandingan berhasil diambil.',200);
        } catch (Throwable $e) {
            error_log('MatchController::getDrafts - ' . $e->getMessage());

            jsonResponse(null, 'Terjadi kesalahan pada server.', 500, [
                'error' => [
                    'code' => 'INTERNAL_SERVER_ERROR'
                ]
            ]);
        }
    }
}
