<?php

function getPaginationParams(): array
{
    $page = isset($_GET['page'])
        ? (int) $_GET['page']
        : 1;

    $limit = isset($_GET['limit'])
        ? (int) $_GET['limit']
        : 20;

    if ($page < 1) {
        $page = 1;
    }

    if ($limit < 1) {
        $limit = 20;
    }

    if ($limit > 100) {
        $limit = 100;
    }

    $offset = ($page - 1) * $limit;

    return [
        'page' => $page,
        'limit' => $limit,
        'offset' => $offset,
    ];
}

function paginationMeta(
    int $page,
    int $limit,
    int $total
): array {
    return [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'total_pages' => $limit > 0
            ? (int) ceil($total / $limit)
            : 0,
    ];
}