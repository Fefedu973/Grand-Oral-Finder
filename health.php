<?php
declare(strict_types=1);

require __DIR__ . '/lib/database.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $database = database();
    $database->query('SELECT 1');
    $database->close();
    echo "ok\n";
} catch (Throwable $error) {
    error_log('Grand Oral health check failed: ' . $error->getMessage());
    http_response_code(503);
    echo "unavailable\n";
}
