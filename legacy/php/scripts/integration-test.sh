#!/usr/bin/env bash
set -euo pipefail
umask 077

backup=${1:?Usage: integration-test.sh /path/to/grand-oral.sql.gz}
project=grand-oral-migration-test
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
environment=$(mktemp)
db_password=$(openssl rand -hex 24)
db_root_password=$(openssl rand -hex 32)

cleanup() {
  docker compose --env-file "$environment" -f "$root/compose.yaml" -p "$project" \
    down -v --remove-orphans >/dev/null 2>&1 || true
  rm -f "$environment"
}

finish() {
  status=$?
  trap - EXIT
  if [[ $status -ne 0 ]]; then
    docker compose --env-file "$environment" -f "$root/compose.yaml" -p "$project" ps || true
    docker compose --env-file "$environment" -f "$root/compose.yaml" -p "$project" logs --no-color --tail=100 || true
  fi
  cleanup
  exit "$status"
}
trap finish EXIT

cat >"$environment" <<EOF
DB_USER=grand_oral
DB_PASSWORD=$db_password
DB_ROOT_PASSWORD=$db_root_password
APP_ACCEPT_SUBMISSIONS=false
SHOW_CONTACTS=false
EOF
chmod 600 "$environment"

docker compose --env-file "$environment" -f "$root/compose.yaml" -p "$project" \
  up -d --build

database=$(docker compose --env-file "$environment" -f "$root/compose.yaml" -p "$project" ps -q database)
app=$(docker compose --env-file "$environment" -f "$root/compose.yaml" -p "$project" ps -q app)
test -n "$database"
test -n "$app"

for _ in $(seq 1 90); do
  if [[ $(docker inspect -f '{{.State.Health.Status}}' "$database" 2>/dev/null || true) == healthy ]]; then
    break
  fi
  sleep 2
done
test "$(docker inspect -f '{{.State.Health.Status}}' "$database")" = healthy

gunzip -c "$backup" | docker exec -e MYSQL_PWD="$db_root_password" -i "$database" mariadb -uroot
rows=$(docker exec -e MYSQL_PWD="$db_password" "$database" \
  mariadb -ugrand_oral --batch --skip-column-names \
  -e 'SELECT COUNT(*) FROM grand_oral.commissions')
test "$rows" = 1338

test_commission=9999
while [[ $(docker exec -e MYSQL_PWD="$db_password" "$database" \
  mariadb -ugrand_oral --batch --skip-column-names \
  -e "SELECT COUNT(*) FROM grand_oral.commissions WHERE numero_commission = $test_commission") -ne 0 ]]; do
  test_commission=$((test_commission - 1))
done

for _ in $(seq 1 60); do
  if [[ $(docker inspect -f '{{.State.Health.Status}}' "$app" 2>/dev/null || true) == healthy ]]; then
    break
  fi
  sleep 2
done
test "$(docker inspect -f '{{.State.Health.Status}}' "$app")" = healthy

docker exec -e TEST_COMMISSION="$test_commission" -i "$app" php <<'PHP'
<?php
$health = file_get_contents('http://127.0.0.1:8080/health.php');
if ($health !== "ok\n") {
    exit(1);
}

$payload = http_build_query([
    'numéro_de_commission' => getenv('TEST_COMMISSION'),
    'spécialitée1' => 'Mathématiques',
    'spécialitée2' => 'Physique-Chimie',
    'date' => '2026-07-16T10:00',
    'contact' => 'migration-test@example.invalid',
]);
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => $payload,
        'ignore_errors' => true,
    ],
]);
$page = file_get_contents('http://127.0.0.1:8080/result.php', false, $context);
$hasReadOnlyNotice = str_contains($page, 'lecture seule');
$hasEmptyResult = str_contains($page, 'Aucune donnée trouvée');
printf(
    "HTTP_HEALTH=%s READ_ONLY_NOTICE=%s EMPTY_RESULT=%s\n",
    trim($health),
    $hasReadOnlyNotice ? 'yes' : 'no',
    $hasEmptyResult ? 'yes' : 'no',
);
if (!$hasReadOnlyNotice || !$hasEmptyResult) {
    exit(1);
}
PHP

printf 'RESTORE_ROWS=%s\nINTEGRATION=OK\n' "$rows"
