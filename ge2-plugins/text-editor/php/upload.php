<?php
declare(strict_types=1);

/**
 * upload.php — receives one image, video or audio file from ../js/text-editor.js
 * and stores it under ../uploads/<path>/.
 *
 * This writes attacker-supplied bytes into the web root, so every rule below
 * is load-bearing:
 *   - the extension comes from a whitelist keyed by the SNIFFED mime type,
 *     never from the uploaded filename;
 *   - the stored name is random, so nothing can be overwritten or guessed;
 *   - `path` must already match [a-z0-9/_-] and is re-checked against the
 *     resolved root, so ../ is rejected rather than quietly rewritten;
 *   - ../uploads/.htaccess stops anything there being executed.
 *
 * NOT INCLUDED: authentication. As written, anyone who can reach this URL can
 * fill the disk. Put it behind your app's login, or restrict it in the web
 * server config, before exposing it.
 */

const MEDIA_DIR  = __DIR__ . '/../uploads';
const MAX_BYTES  = 25 * 1024 * 1024;          // 25 MB
const ALLOWED    = [
    'image/png'  => 'png',
    'image/jpeg' => 'jpg',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
    'image/avif' => 'avif',
    'video/mp4'  => 'mp4',
    'video/webm' => 'webm',
    'video/ogg'  => 'ogv',
    // Audio. finfo on Debian reports WAV as audio/x-wav; the other spellings
    // are what some libmagic builds return, so accept them all.
    'audio/mpeg'     => 'mp3',
    'audio/ogg'      => 'ogg',
    'audio/x-wav'    => 'wav',
    'audio/wav'      => 'wav',
    'audio/wave'     => 'wav',
    'audio/vnd.wave' => 'wav',
];

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

$file = $_FILES['file'] ?? null;
if (!$file || !is_uploaded_file($file['tmp_name'] ?? '')) {
    fail('no file uploaded');
}
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    fail('upload error ' . $file['error']);
}
if (($file['size'] ?? 0) <= 0 || $file['size'] > MAX_BYTES) {
    fail('file too large');
}

// Sniff the bytes; the client-declared type and the filename are both ignored.
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']) ?: '';
if (!isset(ALLOWED[$mime])) {
    fail('unsupported type: ' . $mime);
}
$ext = ALLOWED[$mime];

// The subfolder must already be clean. Rejecting beats silently rewriting:
// stripping the dots out of ../../x would quietly create media/x instead.
$raw = (string) ($_POST['path'] ?? '');
if ($raw !== '' && ($raw[0] === '/' || $raw[0] === '\\')) {
    fail('bad path');                 // absolute-looking input, not a subfolder
}
$rel = rtrim($raw, '/');
if ($rel !== '' && !preg_match('#^[a-z0-9][a-z0-9/_-]*$#', $rel)) {
    fail('bad path');
}
if (str_contains($rel, '..') || str_contains($rel, '//')) {
    fail('bad path');
}

$root = realpath(MEDIA_DIR);
if ($root === false) {
    if (!@mkdir(MEDIA_DIR, 0755, true) && !is_dir(MEDIA_DIR)) fail('media root missing', 500);
    $root = realpath(MEDIA_DIR);
}

$dir = $rel === '' ? $root : $root . '/' . $rel;
if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
    fail('cannot create directory', 500);
}

// Belt and braces: the resolved directory must still sit inside the root.
$real = realpath($dir);
if ($real === false || !str_starts_with($real . '/', $root . '/')) {
    fail('bad path');
}

$name = bin2hex(random_bytes(8)) . '.' . $ext;
$dest = $real . '/' . $name;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    fail('could not store file', 500);
}
@chmod($dest, 0644);

// A path inside uploads/, not a URL: the caller resolves it against the
// plugin, so it stays correct for pages at any depth.
echo json_encode([
    'stored' => ($rel === '' ? '' : $rel . '/') . $name,
    'type'   => $mime,
    'size'   => $file['size'],
]);
