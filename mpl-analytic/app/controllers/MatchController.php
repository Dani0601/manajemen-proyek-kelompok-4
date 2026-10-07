<?php
// app/controllers/MatchController.php
require_once __DIR__ . '/../services/MatchService.php';
require_once __DIR__ . '/../helpers/Apiresponse.php';

class MatchController {
    private $matchService;

    public function __construct($db) {
        $this->matchService = new MatchService($db);
    }

    public function getDetail($matchId) {
        try {
            if (!is_numeric($matchId)) {
                ApiResponse::error("Invalid match ID format.", 400);
                return;
            }

            $data = $this->matchService->getMatchDetail($matchId);
            
            if (!$data) {
                ApiResponse::error("Match detail tidak ditemukan.", 404);
                return;
            }

            ApiResponse::success($data, "Match detail fetched successfully");
        } catch (Exception $e) {
            ApiResponse::error("Internal Server Error: " . $e->getMessage(), 500);
        }
    }

    public function getDrafts($matchId) {
        try {
            if (!is_numeric($matchId)) {
                ApiResponse::error("Invalid match ID format.", 400);
                return;
            }

            $data = $this->matchService->getMatchDrafts($matchId);
            
            if (!$data) {
                ApiResponse::error("Data riwayat draft untuk match ini tidak ditemukan.", 404);
                return;
            }

            ApiResponse::success($data, "Match draft history fetched successfully");
        } catch (Exception $e) {
            ApiResponse::error("Internal Server Error: " . $e->getMessage(), 500);
        }
    }
}
?>