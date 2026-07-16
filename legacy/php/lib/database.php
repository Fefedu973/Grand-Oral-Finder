<?php
declare(strict_types=1);

function required_environment(string $name): string
{
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException("Missing required environment variable: {$name}");
    }

    return $value;
}

function database(): mysqli
{
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $database = mysqli_init();
    $database->options(MYSQLI_OPT_CONNECT_TIMEOUT, 5);
    $database->real_connect(
        getenv('DB_HOST') ?: 'database',
        required_environment('DB_USER'),
        required_environment('DB_PASSWORD'),
        getenv('DB_NAME') ?: 'grand_oral',
        (int) (getenv('DB_PORT') ?: 3306),
    );
    $database->set_charset('utf8mb4');

    return $database;
}
