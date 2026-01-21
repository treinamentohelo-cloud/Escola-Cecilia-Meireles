<?php
// ====================================================================================
// API BACKEND PARA HOSTINGER
// Salve este arquivo como 'api.php' na pasta 'public_html' da sua hospedagem.
// ====================================================================================

// Cabeçalhos CORS para permitir acesso do React
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Trata preflight request do navegador
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// CONFIGURAÇÃO DO BANCO DE DADOS
$host = 'localhost';
$db_name = 'u850687847_database';
$username = 'u850687847_usuario';
$password = 'SUA_SENHA_DO_BANCO_AQUI'; // <--- IMPORTANTE: COLOQUE SUA SENHA AQUI ANTES DE FAZER UPLOAD

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erro de conexão com o banco de dados: " . $e->getMessage()]);
    exit();
}

// Roteamento Básico
$method = $_SERVER['REQUEST_METHOD'];
$table = isset($_GET['table']) ? preg_replace('/[^a-z0-9_]/', '', $_GET['table']) : ''; // Sanitização básica
$id = isset($_GET['id']) ? $_GET['id'] : '';

// Captura dados do Body (JSON)
$inputJSON = file_get_contents("php://input");
$data = json_decode($inputJSON, true);

// Health Check
if ($table === 'health') {
    echo json_encode(["status" => "online", "time" => date('Y-m-d H:i:s')]);
    exit();
}

// ROTA DE LOGIN (Especial)
if ($table === 'login' && $method === 'POST') {
    $email = $data['email'] ?? '';
    $pass = $data['password'] ?? '';
    
    // Busca usuário
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verificação simples (Idealmente usar password_verify com hash)
    if ($user && $user['password'] === $pass) {
        unset($user['password']); // Remove senha do retorno
        echo json_encode($user);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Credenciais inválidas"]);
    }
    exit();
}

// Validação de Tabela
if (!$table) {
    echo json_encode(["message" => "API Online. Informe ?table=nome_da_tabela"]);
    exit();
}

// Operações CRUD
switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $conn->prepare("SELECT * FROM $table WHERE id = :id");
            $stmt->execute(['id' => $id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            // Filtros simples via query params (ex: ?class_id=123)
            $whereClauses = [];
            $params = [];
            foreach ($_GET as $key => $val) {
                if ($key !== 'table' && $key !== 'id') {
                    $whereClauses[] = "$key = :$key";
                    $params[$key] = $val;
                }
            }
            
            $sql = "SELECT * FROM $table";
            if (!empty($whereClauses)) {
                $sql .= " WHERE " . implode(" AND ", $whereClauses);
            }
            // Ordenação padrão por created_at se existir
            if ($table !== 'users') { // Exemplo
                 $sql .= " ORDER BY created_at DESC";
            }

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        $keys = array_keys($data);
        $fields = implode(", ", $keys);
        $placeholders = ":" . implode(", :", $keys);
        
        // Converte Arrays/Objetos para JSON string (para colunas JSON do MySQL)
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
             echo json_encode(["error" => "Erro ao deletar (verifique dependências): " . $e->getMessage()]);
        }
        break;
}
?>