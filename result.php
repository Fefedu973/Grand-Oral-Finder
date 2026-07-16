<?php
declare(strict_types=1);

require __DIR__ . '/lib/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Méthode non autorisée.');
}

const SPECIALITIES = [
    'Mathématiques',
    'Physique-Chimie',
    'Sciences de la vie et de la Terre',
    "Sciences de l'ingénieur",
    'Numérique et sciences informatiques',
    'Sciences économiques et sociales',
    'Histoire-Géographie, Géopolitique et Sciences politiques',
    'Humanités, littérature et philosophie',
    'Langues, littératures et cultures étrangères',
    'Arts',
    "Littérature, langues et cultures de l'Antiquité",
    'Sports: Education Physique, pratique et culture sportives',
    'Ecologie, Agronomie et Territoires (lycée agricole uniquement)',
];

function text_field(string $name): string
{
    return trim((string) ($_POST[$name] ?? ''));
}

function html(string|int|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function env_flag(string $name, bool $default = false): bool
{
    $value = getenv($name);
    if ($value === false || $value === '') {
        return $default;
    }

    return filter_var($value, FILTER_VALIDATE_BOOL);
}

$commissionInput = text_field('numéro_de_commission');
$speciality1 = text_field('spécialitée1');
$speciality2 = text_field('spécialitée2');
$dateInput = text_field('date');
$contact = mb_substr(strip_tags(text_field('contact')), 0, 255);
$errors = [];

if (!preg_match('/^\d{4}$/', $commissionInput)) {
    $errors[] = 'Le numéro de commission doit contenir exactement quatre chiffres.';
}
if (!in_array($speciality1, SPECIALITIES, true) || !in_array($speciality2, SPECIALITIES, true)) {
    $errors[] = 'Une spécialité sélectionnée est invalide.';
}
if ($speciality1 === $speciality2) {
    $errors[] = 'Les deux spécialités doivent être différentes.';
}
if ($contact === '') {
    $errors[] = 'Le contact est obligatoire.';
}

$date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $dateInput);
$dateErrors = DateTimeImmutable::getLastErrors();
if (
    $date === false ||
    ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
) {
    $errors[] = 'La date et l’heure de passage sont invalides.';
}

if ($errors !== []) {
    http_response_code(422);
    render_page($errors, [], 0, false, $dateInput, false);
    exit;
}

$commission = (int) $commissionInput;
$formattedDate = $date->format('Y-m-d H:i:s');
$acceptSubmissions = env_flag('APP_ACCEPT_SUBMISSIONS');
$showContacts = env_flag('SHOW_CONTACTS');
$messages = [];

try {
    $database = database();

    $existing = $database->prepare(
        'SELECT specialite1, specialite2, date_passage, contact FROM commissions WHERE numero_commission = ?'
    );
    $existing->bind_param('i', $commission);
    $existing->execute();
    $existingResult = $existing->get_result();
    $hasCommission = $existingResult->num_rows > 0;
    $exactMatch = false;

    while ($row = $existingResult->fetch_assoc()) {
        if (
            $speciality1 === $row['specialite1'] &&
            $speciality2 === $row['specialite2'] &&
            $formattedDate === $row['date_passage'] &&
            $contact === $row['contact']
        ) {
            $exactMatch = true;
            break;
        }
    }
    $existing->close();

    if ($exactMatch) {
        $messages[] = 'Ces informations existent déjà : consultation des résultats.';
    } elseif ($acceptSubmissions) {
        $insert = $database->prepare(
            'INSERT INTO commissions (numero_commission, specialite1, specialite2, date_passage, contact) VALUES (?, ?, ?, ?, ?)'
        );
        $insert->bind_param('issss', $commission, $speciality1, $speciality2, $formattedDate, $contact);
        $insert->execute();
        $insert->close();
        $messages[] = $hasCommission
            ? 'Les informations ont été ajoutées aux données déjà présentes pour cette commission.'
            : 'Cette commission était inconnue. Les informations ont été ajoutées.';
    } else {
        $messages[] = 'Cette copie est en lecture seule : aucune nouvelle donnée n’a été enregistrée.';
    }

    $query = $database->prepare(
        'SELECT numero_commission, specialite1, specialite2, date_passage, contact FROM commissions WHERE numero_commission = ? ORDER BY date_passage, id'
    );
    $query->bind_param('i', $commission);
    $query->execute();
    $rows = $query->get_result()->fetch_all(MYSQLI_ASSOC);
    $query->close();

    $totalResult = $database->query('SELECT COUNT(*) AS total FROM commissions');
    $total = (int) $totalResult->fetch_assoc()['total'];
    $database->close();

    render_page($messages, $rows, $total, $showContacts, $date->format('Y-m-d'), true);
} catch (Throwable $error) {
    error_log('Grand Oral database error: ' . $error->getMessage());
    http_response_code(503);
    render_page(
        ['Le service de recherche est temporairement indisponible. Réessayez ultérieurement.'],
        [],
        0,
        false,
        $date->format('Y-m-d'),
        false,
    );
}

function render_page(
    array $messages,
    array $rows,
    int $total,
    bool $showContacts,
    string $selectedDate,
    bool $showExplanation,
): void {
    $count = count($rows);
    ?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Résultats | Grand Oral Finder</title>
    <style>
        :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
        body { max-width: 72rem; margin: 0 auto; padding: 2rem 1rem 4rem; line-height: 1.55; }
        a { color: inherit; }
        .notice { padding: .75rem 1rem; margin: 0 0 .75rem; border: 1px solid currentColor; border-radius: .4rem; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
        th, td { padding: .65rem; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); text-align: left; }
        tr.same-day { background: #fff3a3; color: #171717; }
    </style>
</head>
<body>
    <p><a href="./">← Modifier les informations</a></p>
    <h1>Résultats</h1>
    <?php foreach ($messages as $message): ?>
        <p class="notice"><?= html($message) ?></p>
    <?php endforeach; ?>

    <?php if ($rows !== []): ?>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Commission</th>
                        <th>Spécialité 1</th>
                        <th>Spécialité 2</th>
                        <th>Date de passage</th>
                        <?php if ($showContacts): ?><th>Contact</th><?php endif; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($rows as $row): ?>
                        <?php $sameDay = substr((string) $row['date_passage'], 0, 10) === $selectedDate; ?>
                        <tr<?= $sameDay ? ' class="same-day"' : '' ?>>
                            <td><?= html($row['numero_commission']) ?></td>
                            <td><?= html($row['specialite1']) ?></td>
                            <td><?= html($row['specialite2']) ?></td>
                            <td><?= html($row['date_passage']) ?></td>
                            <?php if ($showContacts): ?><td><?= html($row['contact']) ?></td><?php endif; ?>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <p><?= $count ?> résultat<?= $count > 1 ? 's' : '' ?> pour cette commission, parmi <?= $total ?> entrées.</p>
    <?php else: ?>
        <p>Aucune donnée trouvée pour cette commission.</p>
    <?php endif; ?>

    <?php if ($showExplanation): ?>
        <h2>Comment interpréter les résultats ?</h2>
        <p>Les lignes sur fond jaune correspondent à la date de passage saisie. Les informations proviennent d’autres utilisateurs et ne sont pas vérifiées.</p>
        <p>Ces résultats restent des estimations : préparez vos deux sujets indépendamment de cette recherche.</p>
    <?php endif; ?>
</body>
</html>
    <?php
}
