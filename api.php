<?php
// ====================================================================================
// API BACKEND PARA HOSTINGER
// Salve este arquivo como api.php e faça upload para public_html
// ====================================================================================

// Cabeçalhos CORS (Permite que o React acesse este PHP)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Se for uma requisição OPTIONS (pre-flight do navegador), retorna OK e para.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. CONFIGURAÇÃO DO BANCO DE DADOS
// ------------------------------------------------------------------------------------
$host = 'localhost';
$db_name = 'u850687847_database';
$username = 'u850687847_usuario';
$password = 'SUA_SENHA_DO_BANCO_AQUI'; // <--- ATENÇÃO: COLOQUE SUA SENHA REAL AQUI

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    // Configura o PDO para lançar exceções em caso de erro
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Erro de conexão com o banco: " . $e->getMessage()]);
    exit();
}

// Captura parâmetros da URL
$method = $_SERVER['REQUEST_METHOD'];
$table = isset($_GET['table']) ? preg_replace('/[^a-z0-9_]/', '', $_GET['table']) : ''; // Sanitização básica
$id = isset($_GET['id']) ? $_GET['id'] : '';
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 2. ROTA DE UPLOAD DE ARQUIVOS (FOTOS/PDFs)
// ------------------------------------------------------------------------------------
if ($action === 'upload' && $method === 'POST') {
    if (isset($_FILES['file'])) {
        $uploadDir = 'uploads/';
        // Cria a pasta uploads se não existir
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $extension = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
        $newFileName = uniqid() . '.' . $extension;
        $targetFile = $uploadDir . $newFileName;

        if (move_uploaded_file($_FILES['file']['tmp_name'], $targetFile)) {
            // Retorna a URL completa para o React
            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
            $domain = $_SERVER['HTTP_HOST'];
            $path = dirname($_SERVER['PHP_SELF']);
            // Remove barra extra se houver
            $path = rtrim($path, '/');
            
            $fullUrl = "$protocol://$domain$path/$targetFile";
            
            echo json_encode(["success" => true, "url" => $fullUrl]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Falha ao mover arquivo para pasta uploads"]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Nenhum arquivo enviado"]);
    }
    exit();
}

// 3. HEALTH CHECK (Para o ícone de Status Online no App)
// ------------------------------------------------------------------------------------
if ($table === 'health') {
    echo json_encode(["status" => "online", "time" => date('Y-m-d H:i:s')]);
    exit();
}

// 4. ROTA DE LOGIN DO RESPONSÁVEL (Portal dos Pais)
// ------------------------------------------------------------------------------------
if ($action === 'parent_login' && $method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $reg = $input['registration_number'] ?? '';
    $birth = $input['birth_date'] ?? '';

    $stmt = $conn->prepare("SELECT * FROM students WHERE registration_number = :reg AND birth_date = :birth LIMIT 1");
    $stmt->execute(['reg' => $reg, 'birth' => $birth]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($student) {
        echo json_encode($student); // Retorna o aluno direto
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Dados não conferem"]);
    }
    exit();
}

// 5. ROTA DE LOGIN ADMINISTRATIVO (Professores/Admin)
// ------------------------------------------------------------------------------------
if ($table === 'login' && $method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $email = $input['email'] ?? '';
    $pass = $input['password'] ?? '';
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verificação simples de senha (para produção, use password_hash/verify)
    if ($user && $user['password'] === $pass) {
        unset($user['password']); // Não envia a senha de volta
        echo json_encode($user);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Credenciais inválidas"]);
    }
    exit();
}

// Validação de segurança: se não tem tabela especificada, para aqui.
if (!$table) {
    echo json_encode(["message" => "API Online. Especifique ?table=..."]);
    exit();
}

// Captura JSON input (para POST e PUT)
$inputJSON = file_get_contents("php://input");
$data = json_decode($inputJSON, true);

// 6. OPERAÇÕES CRUD PADRÃO (GET, POST, PUT, DELETE)
// ------------------------------------------------------------------------------------
switch ($method) {
    case 'GET':
        if ($id) {
            // Buscar um registro específico
            $stmt = $conn->prepare("SELECT * FROM $table WHERE id = :id");
            $stmt->execute(['id' => $id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } else {
            // Buscar lista com filtros opcionais
            $whereClauses = [];
            $params = [];
            // Filtros via query params (ex: ?table=students&class_id=123)
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
            // Ordenação padrão (exceto users e settings)
            if ($table !== 'users' && $table !== 'settings') {
                // Verifica se a tabela tem created_at antes de ordenar
                // Simplificação: assume que a maioria tem. Se der erro, remova o ORDER BY.
                if ($table !== 'subjects') $sql .= " ORDER BY created_at DESC";
            }

            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'POST':
        // Criar novo registro
        if (!$data) $data = $_POST; // Fallback se vier via form-data

        $keys = array_keys($data);
        $fields = implode(", ", $keys);
        $placeholders = ":" . implode(", :", $keys);
        
        // Converte arrays para JSON string antes de salvar
        foreach ($data as $key => $value) {
            if (is_array($value)) $data[$key] = json_encode($value);
        }

        $sql = "INSERT INTO $table ($fields) VALUES ($placeholders)";
        
        // Tratamento especial para settings (Upsert)
        if ($table === 'settings') {
             $sql = "INSERT INTO settings (id, value) VALUES (:id, :value) ON DUPLICATE KEY UPDATE value = :value";
        }

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
        // Atualizar registro
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
        // Deletar registro
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