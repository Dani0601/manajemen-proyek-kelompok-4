<?php
$pageTitle = $pageTitle ?? 'MPL Analytic';
$pageDescription = $pageDescription
    ?? 'Analisis statistik dan meta Mobile Legends Professional League Indonesia.';
$pageCss = $pageCss ?? '';
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>

    <meta
        name="description"
        content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>"
    >

    <!-- Google Fonts: Poppins -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
    >

    <!-- Bootstrap 5.3 -->
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >

    <!-- CSS utama -->
    <link
        rel="stylesheet"
        href="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/css/style.css"
    >

    <!-- CSS komponen -->
    <link
        rel="stylesheet"
        href="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/css/components.css"
    >

        <!-- CSS responsive -->
    <link
    rel="stylesheet"
    href="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/css/responsive.css"
    >

    <!-- CSS khusus halaman -->
    <?php if ($pageCss !== ''): ?>
        <link
            rel="stylesheet"
            href="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/css/pages/<?= htmlspecialchars($pageCss, ENT_QUOTES, 'UTF-8') ?>"
        >
    <?php endif; ?>

    <script>
        window.APP_CONFIG = {
            baseUrl: <?= json_encode(defined('BASE_URL') ? BASE_URL : '') ?>,
            assetBase: <?= json_encode(defined('ASSET_BASE') ? ASSET_BASE : '') ?>,
            apiBase: <?= json_encode((defined('BASE_URL') ? BASE_URL : '') . '/api') ?>
        };
    </script>
</head>
<body>
