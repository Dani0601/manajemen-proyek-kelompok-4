<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

require_once dirname(__DIR__) . '/app/helpers/response.php';
require_once dirname(__DIR__) . '/app/helpers/validation.php';
require_once dirname(__DIR__) . '/app/helpers/pagination.php';


/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
*/

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$uri = parse_url(
    $_SERVER['REQUEST_URI'] ?? '/',
    PHP_URL_PATH
);


/*
|--------------------------------------------------------------------------
| Base Path
|--------------------------------------------------------------------------
*/

$basePaths = [
    '/mpl-analytic/public',
];

foreach ($basePaths as $basePath) {
    if (str_starts_with($uri, $basePath)) {
        $uri = substr($uri, strlen($basePath));
        break;
    }
}

$uri = trim($uri, '/');

$segments = $uri === ''
    ? []
    : explode('/', $uri);


/*
|--------------------------------------------------------------------------
| HTTP Method
|--------------------------------------------------------------------------
|
| Untuk tahap pertama API kita menggunakan GET.
|
*/

if ($method !== 'GET') {
    jsonResponse(
        null,
        'Method tidak diizinkan.',
        405,
        [
            'error' => [
                'code' => 'METHOD_NOT_ALLOWED'
            ]
        ]
    );
}


/*
|--------------------------------------------------------------------------
| Controller Loader
|--------------------------------------------------------------------------
|
| Controller hanya di-load ketika endpoint tersebut memang dipanggil.
| Ini membuat routing sudah lengkap walaupun controller belum dibuat.
|
*/

function loadController(string $controllerFile, string $controllerClass): object
{
    $path = dirname(__DIR__) . '/app/controllers/' . $controllerFile;

    if (!file_exists($path)) {
        jsonResponse(
            null,
            'Endpoint belum diimplementasikan.',
            501,
            [
                'error' => [
                    'code' => 'NOT_IMPLEMENTED',
                    'controller' => $controllerClass
                ]
            ]
        );
    }

    require_once $path;

    if (!class_exists($controllerClass)) {
        jsonResponse(
            null,
            'Controller belum tersedia.',
            501,
            [
                'error' => [
                    'code' => 'CONTROLLER_NOT_FOUND',
                    'controller' => $controllerClass
                ]
            ]
        );
    }

    return new $controllerClass();
}

if ($uri === 'api/dashboard') {
    $controller = loadController(
        'DashboardController.php',
        'DashboardController'
    );

    $controller->index();
}
/*
|--------------------------------------------------------------------------
| META
|--------------------------------------------------------------------------
*/

/*
| GET /api/meta
*/

if ($uri === 'api/meta') {

    $controller = loadController(
        'MetaController.php',
        'MetaController'
    );

    $controller->index();
}


/*
|--------------------------------------------------------------------------
| SEASONS
|--------------------------------------------------------------------------
*/

/*
| GET /api/seasons
*/

if ($uri === 'api/seasons') {

    $controller = loadController(
        'MetaController.php',
        'MetaController'
    );

    $controller->seasons();
}


/*
|--------------------------------------------------------------------------
| TEAMS
|--------------------------------------------------------------------------
*/

/*
| GET /api/teams
*/

if ($uri === 'api/teams') {

    $controller = loadController(
        'MetaController.php',
        'MetaController'
    );

    $controller->teams();
}


/*
|--------------------------------------------------------------------------
| HEROES
|--------------------------------------------------------------------------
*/

/*
| GET /api/heroes
*/

if ($uri === 'api/heroes') {

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->index();
}

if (
    $method === 'GET' &&
    $uri === 'api/heroes'
) {
    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->index();
}

if (
    $method === 'GET' &&
    preg_match(
        '#^api/heroes/([0-9]+)/stats$#',
        $uri,
        $matches
    )
) {
    $heroId = validatePositiveInteger(
        $matches[1],
        'hero_id'
    );

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->stats($heroId);
}

if (
    $method === 'GET' &&
    preg_match(
        '#^api/heroes/([0-9]+)/builds$#',
        $uri,
        $matches
    )
) {
    $heroId = validatePositiveInteger(
        $matches[1],
        'hero_id'
    );

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->builds($heroId);
}

if (
    $method === 'GET' &&
    preg_match(
        '#^api/heroes/([0-9]+)/counters$#',
        $uri,
        $matches
    )
) {
    $heroId = validatePositiveInteger(
        $matches[1],
        'hero_id'
    );

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->counters($heroId);
}

if (
    $method === 'GET' &&
    preg_match(
        '#^api/heroes/([0-9]+)/skills$#',
        $uri,
        $matches
    )
) {
    $heroId = validatePositiveInteger(
        $matches[1],
        'hero_id'
    );

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->skills($heroId);
}

if (
    $method === 'GET' &&
    preg_match(
        '#^api/heroes/([0-9]+)$#',
        $uri,
        $matches
    )
) {
    $heroId = validatePositiveInteger(
        $matches[1],
        'hero_id'
    );

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->show($heroId);
}
/*
| GET /api/heroes/{id}
| GET /api/heroes/{id}/stats
| GET /api/heroes/{id}/games
*/

if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'heroes'
) {

    if (!isset($segments[2])) {
        jsonResponse(
            null,
            'Endpoint hero tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND'
                ]
            ]
        );
    }

    $heroId = validatePositiveInteger(
        $segments[2],
        'hero_id'
    );

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );


    /*
    | GET /api/heroes/{id}/stats
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'stats'
    ) {
        $controller->stats($heroId);
    }


    /*
    | GET /api/heroes/{id}/games
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'games'
    ) {

        if (!method_exists($controller, 'games')) {
            jsonResponse(
                null,
                'Endpoint belum diimplementasikan.',
                501,
                [
                    'error' => [
                        'code' => 'NOT_IMPLEMENTED'
                    ]
                ]
            );
        }

        $controller->games($heroId);
    }


    /*
    | GET /api/heroes/{id}
    */

    if (!isset($segments[3])) {
        $controller->show($heroId);
    }
}


/*
|--------------------------------------------------------------------------
| PLAYERS
|--------------------------------------------------------------------------
*/

/*
| GET /api/players
*/

if ($uri === 'api/players') {

    $controller = loadController(
        'PlayerController.php',
        'PlayerController'
    );

    $controller->index();
}


/*
| GET /api/players/{id}
| GET /api/players/{id}/stats
| GET /api/players/{id}/games
*/

if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'players'
) {

    if (!isset($segments[2])) {
        jsonResponse(
            null,
            'Endpoint player tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND'
                ]
            ]
        );
    }

    $playerId = validatePositiveInteger(
        $segments[2],
        'player_id'
    );

    $controller = loadController(
        'PlayerController.php',
        'PlayerController'
    );


    /*
    | GET /api/players/{id}/stats
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'stats'
    ) {
        $controller->stats($playerId);
    }


    /*
    | GET /api/players/{id}/games
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'games'
    ) {
        $controller->games($playerId);
    }


    /*
    | GET /api/players/{id}
    */

    if (!isset($segments[3])) {
        $controller->show($playerId);
    }
}


/*
|--------------------------------------------------------------------------
| TOURNAMENTS
|--------------------------------------------------------------------------
|
| Dalam database tidak ada tabel tournaments.
| Tournament API akan menggunakan:
|
| seasons
| schedules
| matches
| teams
|
*/


/*
| GET /api/tournaments
*/

if ($uri === 'api/tournaments') {

    $controller = loadController(
        'TournamentController.php',
        'TournamentController'
    );

    $controller->index();
}


/*
| GET /api/tournaments/{id}
| GET /api/tournaments/{id}/standings
| GET /api/tournaments/{id}/schedule
*/

if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'tournaments'
) {

    if (!isset($segments[2])) {
        jsonResponse(
            null,
            'Endpoint tournament tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND'
                ]
            ]
        );
    }

    $tournamentId = validatePositiveInteger(
        $segments[2],
        'tournament_id'
    );

    $controller = loadController(
        'TournamentController.php',
        'TournamentController'
    );


    /*
    | GET /api/tournaments/{id}/standings
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'standings'
    ) {
        $controller->standings($tournamentId);
    }


    /*
    | GET /api/tournaments/{id}/schedule
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'schedule'
    ) {
        $controller->schedule($tournamentId);
    }


    /*
    | GET /api/tournaments/{id}
    */

    if (!isset($segments[3])) {
        $controller->show($tournamentId);
    }
}


/*
|--------------------------------------------------------------------------
| MATCHES
|--------------------------------------------------------------------------
*/

/*
| GET /api/matches
*/

if ($uri === 'api/matches') {

    $controller = loadController(
        'MatchController.php',
        'MatchController'
    );

    $controller->index();
}


/*
| GET /api/matches/{id}
| GET /api/matches/{id}/games
*/

if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'matches'
) {

    if (!isset($segments[2])) {
        jsonResponse(
            null,
            'Endpoint match tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND'
                ]
            ]
        );
    }

    /*
    | Match ID disimpan sebagai string.
    | Jangan gunakan validatePositiveInteger().
    */

    $matchId = trim($segments[2]);

    if ($matchId === '') {
        jsonResponse(
            null,
            'match_id wajib diisi.',
            400,
            [
                'error' => [
                    'code' => 'INVALID_MATCH_ID'
                ]
            ]
        );
    }

    $controller = loadController(
        'MatchController.php',
        'MatchController'
    );


    /*
    | GET /api/matches/{id}/games
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'games'
    ) {
        $controller->games($matchId);
    }


    /*
    | GET /api/matches/{id}
    */

    if (!isset($segments[3])) {
        $controller->show($matchId);
    }
}


/*
|--------------------------------------------------------------------------
| GAMES
|--------------------------------------------------------------------------
*/

/*
| GET /api/games
*/

if ($uri === 'api/games') {

    $controller = loadController(
        'GameController.php',
        'GameController'
    );

    $controller->index();
}


/*
| GET /api/games/{id}
| GET /api/games/{id}/players
| GET /api/games/{id}/picks
| GET /api/games/{id}/emblems
| GET /api/games/{id}/items
*/

if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'games'
) {

    if (!isset($segments[2])) {
        jsonResponse(
            null,
            'Endpoint game tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND'
                ]
            ]
        );
    }

    /*
    | game_id adalah VARCHAR.
    */

    $gameId = trim($segments[2]);

    if ($gameId === '') {
        jsonResponse(
            null,
            'game_id wajib diisi.',
            400,
            [
                'error' => [
                    'code' => 'INVALID_GAME_ID'
                ]
            ]
        );
    }

    $controller = loadController(
        'GameController.php',
        'GameController'
    );


    /*
    | GET /api/games/{id}/players
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'players'
    ) {
        $controller->players($gameId);
    }


    /*
    | GET /api/games/{id}/picks
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'picks'
    ) {
        $controller->picks($gameId);
    }


    /*
    | GET /api/games/{id}/emblems
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'emblems'
    ) {
        $controller->emblems($gameId);
    }


    /*
    | GET /api/games/{id}/items
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'items'
    ) {
        $controller->items($gameId);
    }


    /*
    | GET /api/games/{id}
    */

    if (!isset($segments[3])) {
        $controller->show($gameId);
    }
}


/*
|--------------------------------------------------------------------------
| ITEMS
|--------------------------------------------------------------------------
*/

/*
| GET /api/items
*/

if ($uri === 'api/items') {

    $controller = loadController(
        'ItemController.php',
        'ItemController'
    );

    $controller->index();
}


/*
| GET /api/items/{id}
*/

if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'items'
) {

    if (!isset($segments[2])) {
        jsonResponse(
            null,
            'Endpoint item tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND'
                ]
            ]
        );
    }

    $itemId = validatePositiveInteger(
        $segments[2],
        'item_id'
    );

    $controller = loadController(
        'ItemController.php',
        'ItemController'
    );

    $controller->show($itemId);
}


/*
|--------------------------------------------------------------------------
| ENDPOINT TIDAK DITEMUKAN
|--------------------------------------------------------------------------
*/

jsonResponse(
    null,
    'Endpoint tidak ditemukan.',
    404,
    [
        'error' => [
            'code' => 'ENDPOINT_NOT_FOUND'
        ]
    ]
);