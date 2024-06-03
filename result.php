<?php
$servername = "localhost";
$username = "root";
$password = "1418";
$dbname = "grand_oral";

// Connexion à la base de données
$conn = new mysqli($servername, $username, $password, $dbname);

// Vérifier la connexion
if ($conn->connect_error) {
    die("La connexion a échoué: " . $conn->connect_error);
}

// Récupérer les données du formulaire
$numero_commission = intval($_POST['numéro_de_commission']);
$specialite1 = $_POST['spécialitée1'];
$specialite2 = $_POST['spécialitée2'];
$date = $_POST['date'];
$contact = $_POST['contact'];

$date_formatted = date('Y-m-d H:i:s', strtotime($date));
$date_only = date('Y-m-d', strtotime($date));

// Vérifier si le numéro de commission existe déjà
$sql = "SELECT specialite1, specialite2, date_passage, contact FROM commissions WHERE numero_commission = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $numero_commission);
$stmt->execute();
$result = $stmt->get_result();

$exists = false;
$match_found = false;
$specialites = [];

// Récupérer les spécialités existantes
while ($row = $result->fetch_assoc()) {
    $exists = true;
    $specialites[] = [$row['specialite1'], $row['specialite2']];
    
    // Vérifier si les spécialités correspondent
    if (
        $specialite1 === $row['specialite1'] &&
        $specialite2 === $row['specialite2'] &&
        $date_formatted === $row['date_passage'] &&
        $contact === $row['contact']
    ) {
        $match_found = true;
        echo "Vous avez déjà entré ces données, mode consultation <br><br>";
        break;
    }
}

$stmt->close();

if (!$match_found) {
    // Ajouter une nouvelle ligne car les spécialités ne correspondent pas ou la commission n'existe pas
    $sql = "INSERT INTO commissions (numero_commission, specialite1, specialite2, date_passage, contact) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("issss", $numero_commission, $specialite1, $specialite2, $date_formatted, $contact);
    if ($stmt->execute()) {
        if ($exists) {
            echo "D'autres personnes ont trouvé déjà entré le même numéro de commission, vos données ont également été ajoutées<br>";
        } else {
            echo "Le numéro de commission n'a jamais été entré auparavant. Les données ont été ajoutées. Veuillez réessayer ultérieurement pour voir si de nouvelles données sont entrées<br>";
        }
    } else {
        echo "Erreur lors de l'ajout des données : " . $stmt->error;
    }
    $stmt->close();
}

$sql = "SELECT * FROM commissions WHERE numero_commission = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $numero_commission);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo "<table border='1'>";
    echo "<tr><th>Numéro de commission</th><th>Spécialité 1</th><th>Spécialité 2</th><th>Date de Passage</th><th>Contact</th></tr>";
    while ($row = $result->fetch_assoc()) {
        $row_date_only = date('Y-m-d', strtotime($row['date_passage']));
        $highlight = ($row_date_only === $date_only) ? 'style="background-color: yellow;"' : '';
        
        echo "<tr $highlight>";
        echo "<td>" . htmlspecialchars($row['numero_commission']) . "</td>";
        echo "<td>" . htmlspecialchars($row['specialite1']) . "</td>";
        echo "<td>" . htmlspecialchars($row['specialite2']) . "</td>";
        echo "<td>" . htmlspecialchars($row['date_passage']) . "</td>";
        echo "<td>" . htmlspecialchars($row['contact']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "Aucune donnée trouvée pour la commission $numero_commission.<br>";
}

//ajouter un texte qui dit X données affichées parmis Y total de données
// Compter le nombre total de commissions
$sql_total = "SELECT COUNT(*) AS total FROM commissions";
$result_total = $conn->query($sql_total);
$row_total = $result_total->fetch_assoc();
$total_commissions = $row_total['total'];
// Compter le nombre de commissions pour le numéro donné
$sql_count = "SELECT COUNT(*) AS count FROM commissions WHERE numero_commission = ?";
$stmt_count = $conn->prepare($sql_count);
$stmt_count->bind_param("i", $numero_commission);
$stmt_count->execute();
$result_count = $stmt_count->get_result();
$row_count = $result_count->fetch_assoc();
$count_commissions = $row_count['count'];
echo "<p>$count_commissions commissions en commun trouvées parmis $total_commissions données entrées</p>";


echo "<br><p>Comment interpréter les résultats ?</p>";
echo "<p>Les données qui correspondent à votre comission sont affichées dans un tableau ci-dessus. Les lignes avec un fond jaune indiquent que la date de passage est la même que celle que vous avez entrée.</p>";
echo "<p>Les spécialités que vous voyez dans le tableau sont celles qui ont été entrées par d'autres personnes pour la même commission.</p>";
echo "<p>C'est à vous de décider si vous souhaitez prendre en compte ces données pour votre propre commission et comment les interpréter (Exemple: si vous passez à la même heure et avec la même commission que quelqu'un dont la seule spé en commun est maths par exemple alors vous pouvez assez vite deviner que le professeur du jury est un prof de maths et que vous serez interrogé sur votre sujet de maths). En sachant que nous ne savons pas si les comissions changent dans la même journée</p>";
echo "<p>ATTENTION : Les données sont affichées ont été entrées par d'autres personnes et ne sont pas vérifiées.</p>";

$conn->close();
?>
