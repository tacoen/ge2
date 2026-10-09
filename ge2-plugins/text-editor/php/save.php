<?php
declare(strict_types=1);

/**
 * save.php — stores the markdown from ../js/text-editor.js as
 * ../uploads/<path>/<name>.md.
 *
 * The storage root is fixed HERE, not sent by the browser: the request only
 * chooses a subfolder and a name.
 *
 * Same posture as upload.php: this writes attacker-supplied bytes into the
 * web root, so nothing from the request is trusted as a path.
 *   - the extension is always .md, never taken from the request;
 *   - `path` and `name` must already match a strict charset — a hostile
 *     value is rejected, not rewritten into something "safe";
 *   - the resolved directory is re-checked against TEXT_DIR;
 *   - ../uploads/.htaccess stops anything there being executed.
 *
 * Unlike upload.php this OVERWRITES by design: saving the same note twice
 * must replace it. That makes the name check the only thing standing between
 * a caller and clobbering another note, so keep the charset strict.
 *
 * NOT INCLUDED: authentication. Anyone who can reach this URL can write and
 * overwrite notes. Put it behind your app's login before exposing it.
 */

const TEXT_DIR  = __DIR__ . '/../uploads';
const MAX_BYTES = 1024 * 1024;               // 1 MB of markdown

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

function fail(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('POST only', 405);
}

$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > MAX_BYTES) {
    fail('too large');
}

$req = json_decode($raw, true);
if (!is_array($req)) {
    fail('expected a JSON body');
}

$source = $req['source'] ?? null;
if (!is_string($source)) {
    fail('missing source');
}

// name -> <name>.md. The extension is ours; the request never supplies one.
$name = (string) ($req['name'] ?? '');
if (!preg_match('#^[a-z0-9][a-z0-9_-]{0,63}$#', $name)) {
    fail('bad name');
}

$path = (string) ($req['path'] ?? '');
if ($path !== '' && ($path[0] === '/' || $path[0] === '\\')) {
    fail('bad path');
}
$path = rtrim($path, '/');
if ($path !== '' && !preg_match('#^[a-z0-9][a-z0-9/_-]*$#', $path)) {
    fail('bad path');
}
if (str_contains($path, '..') || str_contains($path, '//')) {
    fail('bad path');
}

if (!is_dir(TEXT_DIR) && !@mkdir(TEXT_DIR, 0755, true) && !is_dir(TEXT_DIR)) {
    fail('text root missing', 500);
}
$root = realpath(TEXT_DIR);
if ($root === false) {
    fail('text root missing', 500);
}

$dir = $path === '' ? $root : $root . '/' . $path;
if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
    fail('cannot create directory', 500);
}

$real = realpath($dir);
if ($real === false || !str_starts_with($real . '/', $root . '/')) {
    fail('bad path');
}

$dest = $real . '/' . $name . '.md';
if (file_put_contents($dest, $source, LOCK_EX) === false) {
    fail('could not write file', 500);
}
@chmod($dest, 0644);

echo json_encode([
    'stored' => ($path === '' ? '' : $path . '/') . $name . '.md',
    'bytes'  => strlen($source),
]);
