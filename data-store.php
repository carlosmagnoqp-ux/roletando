<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");

$storageFile = __DIR__ . DIRECTORY_SEPARATOR . "roleta-data.json";

$defaultData = [
    "credentials" => [
        "username" => "admin",
        "password" => "1234",
    ],
    "config" => [
        "title" => "Roleta de Brindes",
        "subtitle" => "Gire a roleta, descubra seu brinde e tire um print da tela.",
        "spinButtonText" => "Girar roleta",
        "pointerColor" => "#f4f1de",
        "centerColor" => "#ffffff",
        "backgroundStart" => "#17324d",
        "backgroundEnd" => "#0a1724",
        "wheelBorderColor" => "#ffffff",
        "textColor" => "#ffffff",
        "shadowColor" => "rgba(0, 0, 0, 0.25)",
        "wheelSize" => 420,
        "fontFamily" => "'Trebuchet MS', sans-serif",
        "items" => [
            ["label" => "Caneca", "color" => "#e76f51"],
            ["label" => "Chaveiro", "color" => "#2a9d8f"],
            ["label" => "Desconto 10%", "color" => "#e9c46a"],
            ["label" => "Camiseta", "color" => "#264653"],
            ["label" => "Brinde Surpresa", "color" => "#f4a261"],
            ["label" => "Squeeze", "color" => "#8ab17d"],
        ],
    ],
];

function readStorage(string $storageFile, array $defaultData): array
{
    if (!file_exists($storageFile)) {
        writeStorage($storageFile, $defaultData);
        return $defaultData;
    }

    $raw = file_get_contents($storageFile);
    if ($raw === false) {
        http_response_code(500);
        echo json_encode(["error" => "Nao foi possivel ler o arquivo de dados."]);
        exit;
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        writeStorage($storageFile, $defaultData);
        return $defaultData;
    }

    return [
        "credentials" => array_merge($defaultData["credentials"], $decoded["credentials"] ?? []),
        "config" => array_merge($defaultData["config"], $decoded["config"] ?? []),
    ];
}

function writeStorage(string $storageFile, array $data): void
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($storageFile, $json, LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode(["error" => "Nao foi possivel salvar o arquivo de dados."]);
        exit;
    }
}

function readRequestBody(): array
{
    $raw = file_get_contents("php://input");
    if ($raw === false || $raw === "") {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
$action = $_GET["action"] ?? "read";
$storage = readStorage($storageFile, $defaultData);

if ($method === "GET" && $action === "read") {
    echo json_encode([
        "config" => $storage["config"],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$payload = readRequestBody();

if ($method === "POST" && $action === "login") {
    $username = trim((string) ($payload["username"] ?? ""));
    $password = (string) ($payload["password"] ?? "");

    $isValid = $username === $storage["credentials"]["username"]
        && $password === $storage["credentials"]["password"];

    echo json_encode(["success" => $isValid], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method === "POST" && $action === "save-config") {
    $config = $payload["config"] ?? null;
    if (!is_array($config) || count($config["items"] ?? []) < 2) {
        http_response_code(422);
        echo json_encode(["error" => "Configuracao invalida."]);
        exit;
    }

    $storage["config"] = array_merge($defaultData["config"], $config);
    writeStorage($storageFile, $storage);

    echo json_encode(["success" => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($method === "POST" && $action === "update-credentials") {
    $currentUsername = trim((string) ($payload["currentUsername"] ?? ""));
    $currentPassword = (string) ($payload["currentPassword"] ?? "");
    $newUsername = trim((string) ($payload["newUsername"] ?? ""));
    $newPassword = (string) ($payload["newPassword"] ?? "");

    $matchesCurrent = $currentUsername === $storage["credentials"]["username"]
        && $currentPassword === $storage["credentials"]["password"];

    if (!$matchesCurrent) {
        http_response_code(401);
        echo json_encode(["error" => "Credenciais atuais invalidas."]);
        exit;
    }

    if ($newUsername === "" || $newPassword === "") {
        http_response_code(422);
        echo json_encode(["error" => "Novo login e senha sao obrigatorios."]);
        exit;
    }

    $storage["credentials"] = [
        "username" => $newUsername,
        "password" => $newPassword,
    ];
    writeStorage($storageFile, $storage);

    echo json_encode(["success" => true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(404);
echo json_encode(["error" => "Acao invalida."]);
