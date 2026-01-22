<?php
// ====================================================================================
// API BACKEND PARA HOSTINGER (ATUALIZADO)
// ====================================================================================

// Cabeçalhos CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// CONFIGURAÇÃO DO BANCO
$host = 'localhost';
$db_name = 'u850687847_database';
$username = 'u850687847_usuario';
$password = 'SUA_SENHA_DO_BANCO_AQUI'; // <--- ATUALIZE AQUI COM SUA SENHA

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erro de conexão: " . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$table = isset($_GET['table']) ? preg_replace('/[^a-z0-9_]/', '', $_GET['table']) : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 1. ROTA DE UPLOAD DE ARQUIVOS
if ($action === 'upload' && $method === 'POST') {
    if (isset($_FILES['file'])) {
        $uploadDir = 'uploads/';
        // Cria a pasta se não existir
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $extension = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
        $newFileName = uniqid() . '.' . $extension;
        $targetFile = $uploadDir . $newFileName;

        if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFile)) {
            // Retorna a URL completa
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
            $domain = $_SERVER['HTTP_HOST'];
            $path = dirname($_SERVER['PHP_SELF']);
            $fullUrl = "$protocol://$domain$path/$targetFile";
            
            echo json_encode(["success" => true, "url" => $fullUrl]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Falha ao mover arquivo"]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Nenhum arquivo enviado"]);
    }
    exit();
}

// Health Check
if ($table === 'health') {
    echo json_encode(["status" => "online", "time" => date('Y-m-d H:i:s')]);
    exit();
}

// 2. ROTA DE LOGIN PARENTAL (Portal do Responsável)
if ($action === 'parent_login' && $method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $reg = $input['registration_number'] ?? '';
    $birth = $input['birth_date'] ?? '';

    $stmt = $conn->prepare("SELECT * FROM students WHERE registration_number = :reg AND birth_date = :birth LIMIT 1");
    $stmt->execute(['reg' => $reg, 'birth' => $birth]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($student) {
        echo json_encode(["success" => true, "student" => $student]);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Dados não conferem"]);
    }
    exit();
}

// 3. ROTA DE LOGIN ADMIN/PROF
if ($table === 'login' && $method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $email = $input['email'] ?? '';
    $pass = $input['password'] ?? '';
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && $user['password'] === $pass) {
        unset($user['password']);
        echo json_encode($user);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Credenciais inválidas"]);
    }
    exit();
}

// Validação de Tabela
if (!$table) {
    echo json_encode(["message" => "API Online."]);
    exit();
}

// Captura JSON input para POST/PUT padrão
$inputJSON = file_get_contents("php://input");
$data = json_decode($inputJSON, true);

// Operações CRUD Padrão
switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM $table WHERE id = :id");
            $stmt->execute(['id' => $id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            $whereClauses = [];
            $params = [];
            foreach ($_GET as $key => $val) {
                if ($key !== 'table' && $key !== 'id' && $key !== 'action') {
                    $whereClauses[] = "$key = :$key";
                    $params[$key] = $val;
                }
            }
            
            $sql = "SELECT * FROM $table";
            if (!empty($whereClauses)) {
                $sql .= " WHERE " . implode(" AND ", $whereClauses);
            }
            if ($table !== 'users') $sql .= " ORDER BY created_at DESC";

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        if (!$data) $data = $_POST; // Fallback se não for JSON body

        $keys = array_keys($data);
        $fields = implode(", ", $keys);
        $placeholders = ":" . implode(", :", $keys);
        
        foreach ($data as $key => $value) {
            if (is_array($value)) $data[$key] = json_encode($value);
        }

        $sql = "INSERT INTO $table ($fields) VALUES ($placeholders)";
        $stmt = $conn->prepare($sql);
        try {
            $stmt->execute($data);
            echo json_encode(["success" => true, "id" => $data['id'] ?? null]);
        } catch (PDOException $e) {
            http_response_code(400);
            echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(["error" => "ID required"]); exit(); }
        
        $fields = "";
        foreach ($data as $key => $value) {
            $fields .= "$key = :$key, ";
            if (is_array($value)) $data[$key] = json_encode($value);
        }
        $fields = rtrim($fields, ", ");
        $data['id'] = $id;

        $sql = "UPDATE $table SET $fields WHERE id = :id";
        $stmt = $conn->prepare($sql);
        try {
            $stmt->execute($data);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
             http_response_code(400);
             echo json_encode(["error" => $e->getMessage()]);
        }
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(["error" => "ID required"]); exit(); }
        try {
            $stmt = $conn->prepare("DELETE FROM $table WHERE id = :id");
            $stmt->execute(['id' => $id]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
             http_response_code(400);
             echo json_encode(["error" => "Erro ao deletar: " . $e->getMessage()]);
        }
        break;
}
?>