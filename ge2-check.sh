#!/usr/bin/env bash
# ge2-check.sh — check every ge2-based project against the same rules.
# Read-only: it reports, it never fixes. Lives in ge2, the upstream; companion to ../sync-ge2.sh.
#
# Checks (FAIL = breaks a ge2 rule, WARN = worth a look):
#   drift      css/ge2/, js/ge2/ differ from upstream          FAIL
#   layers     root stylesheet declares the ge2 layer order     FAIL
#   inline-js  inline <script> or on*= handlers in html/php     FAIL
#   storage    raw localStorage outside js/ge2/store.js         FAIL
#   entry      both index.php and index.html at the root         FAIL
#   modules    css/<name>.css imports the root sheet, never ge2,
#              never redeclares the layer order (nor do its parts) FAIL
#              ...and has a matching js/<name>.js               WARN
#   paths      root-absolute src/href/import/url(), localhost    FAIL
#   cdn        CDN URL outside a config.js, or not version-pinned FAIL
#   core       js/ge2 imports outside itself or names a plugin;
#              css/ge2 imports anything                         FAIL
#   plugins    ge2-plugins/<name>/ missing readme, config, js/css
#              entry, init export, or an exec-disabled uploads/ FAIL
#              ...or its PHP reaches outside its folder (../../,
#              DOCUMENT_ROOT, media/)                           FAIL
#   roots      request data passed straight to a filesystem call WARN
#   colors     hardcoded colours outside token definitions      WARN
#
# <project>/.ge2-check-ignore lists paths (relative, one per line) to skip,
# for third-party code the project doesn't own — e.g. a bundled wiki.
#
# Usage: ./ge2-check.sh [project...]   (default: ge2 + every synced project)
# Exit:  1 if any FAIL, else 0.

set -uo pipefail

ROOT=${GE2_ROOT:-/var/www/dash}   # override to test against fixtures
UPSTREAM=ge2
LAYERS='@layer units, base, ui, plugin, page, utils;'
SHOW=5          # matches printed per check
CDN='(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh|esm\.run|cdn\.skypack\.dev|ga\.jspm\.io|fonts\.googleapis\.com)'
COMMENT='^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*)'   # grep -n line that starts with a comment
PRUNE=(-name .git -o -name node_modules -o -name vendor)

fails=0

hits() { # label level output: print the first $SHOW lines, count the rest
    local label=$1 level=$2 out=$3 n
    if [ -z "$out" ]; then
        printf '  ok    %s\n' "$label"
        return
    fi
    n=$(printf '%s\n' "$out" | wc -l)
    printf '  %-5s %s (%d)\n' "$level" "$label" "$n"
    printf '%s\n' "$out" | head -n "$SHOW" | sed 's/^/          /'
    [ "$n" -gt "$SHOW" ] && printf '          … %d more\n' $((n - SHOW))
    [ "$level" = FAIL ] && fails=$((fails + 1))
}

files() { # dir, then find name tests: list matching files outside pruned dirs
    local dir=$1 prune=("${PRUNE[@]}") pat; shift
    # <project>/.ge2-check-ignore: paths to skip (third-party code), one per line
    if [ -f "$dir/.ge2-check-ignore" ]; then
        while IFS= read -r pat; do
            [[ -z $pat || $pat == \#* ]] && continue
            prune+=(-o -path "$dir/${pat%/}")
        done < "$dir/.ge2-check-ignore"
    fi
    find "$dir" \( "${prune[@]}" \) -prune -o -type f \( "$@" \) -print 2>/dev/null
}

check_drift() {
    local dir=$1 sub src dst
    command -v rsync >/dev/null || { echo "  WARN  drift (rsync missing)"; return; }
    # same excludes as sync-ge2.sh; compare content, not times/owners
    local opts=(-rlc --delete --dry-run --itemize-changes
                --exclude=config.js --exclude=icons-list.js --exclude='LICENSE*')
    [ -f "$dir/.ge2-sync-exclude" ] && opts+=(--exclude-from="$dir/.ge2-sync-exclude")
    hits "drift from upstream" FAIL "$(
        for sub in css js; do
            src="$ROOT/$UPSTREAM/$sub/$UPSTREAM/"
            dst="$dir/$sub/$UPSTREAM/"
            [ -d "$src" ] && [ -d "$dst" ] || continue
            rsync "${opts[@]}" "$src" "$dst" | sed "s|^|$sub/$UPSTREAM: |"
        done)"
}

root_css() { # the root stylesheet: style.css, or <project>.css where a project names it so (fm)
    if [ -f "$1/style.css" ]; then echo "$1/style.css"; else echo "$1/$(basename "$1").css"; fi
}

check_layers() {
    local css
    css=$(root_css "$1")
    if [ ! -f "$css" ]; then
        hits "layer order" FAIL "no style.css"
        return
    fi
    hits "layer order" FAIL "$(awk -v want="$LAYERS" '
        /^[[:space:]]*@import/ && !seen { print FILENAME ":" NR ": @import before the layer order"; exit }
        /^[[:space:]]*@layer[^{]*;/ {
            line = $0; gsub(/^[[:space:]]+|[[:space:]]+$/, "", line); gsub(/[[:space:]]+/, " ", line)
            if (line != want) print FILENAME ":" NR ": " line "  (want: " want ")"
            seen = 1; exit
        }
        END { if (!seen && NR) print FILENAME ": no @layer order statement" }
    ' "$css")"
}

check_inline_js() {
    hits "inline <script>" FAIL "$(files "$1" -name '*.html' -o -name '*.php' |
        xargs -r grep -nHiE '<script([[:space:]][^>]*)?>' 2>/dev/null |
        grep -viE '<script[^>]*[[:space:]]src=|type=["'"'"']?(application/(ld\+)?json|importmap)')"
    hits "on*= handler attributes" FAIL "$(files "$1" -name '*.html' -o -name '*.php' |
        xargs -r grep -nHiE '<[a-z][^>]*[[:space:]]on[a-z]+[[:space:]]*=' 2>/dev/null)"
}

check_storage() {
    # code that touches it (localStorage. / localStorage[), not comments or prose
    hits "raw localStorage (use js/ge2/store.js)" FAIL "$(files "$1" -name '*.js' -o -name '*.mjs' |
        grep -v "/js/$UPSTREAM/" |
        xargs -r grep -nHE '\blocalStorage[[:space:]]*(\.|\[)' 2>/dev/null |
        grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|\*|/\*)')"
}

check_entry() {
    hits "one root entry (index.php or index.html)" FAIL "$(
        [ -f "$1/index.php" ] && [ -f "$1/index.html" ] && echo "$1: both index.php and index.html")"
}

css_imports() { # file: the @import targets in it, one per line, as written
    grep -oE "@import[[:space:]]+(url\()?[[:space:]]*['\"]?[^'\") ;]+" "$1" 2>/dev/null |
        sed -E "s/^@import[[:space:]]+(url\()?[[:space:]]*['\"]?//"
}

check_modules() {
    local dir=$1 root f p name imported errs="" warns=""
    root=$(realpath -m "$(root_css "$dir")")
    # a sheet another sheet imports is a part, not a module entry
    imported=$(files "$dir" -name '*.css' | while IFS= read -r f; do
        css_imports "$f" | while IFS= read -r p; do
            [[ $p == *://* ]] || realpath -m "$(dirname "$f")/$p"
        done
    done | sort -u)
    while IFS= read -r f; do
        [ -n "$f" ] || continue
        [ "$(realpath -m "$f")" = "$root" ] && continue
        # every sheet but the root: ge2 is wired once, the order declared once
        errs+=$(grep -nHE "^[[:space:]]*@import[^;]*(^|[/'\"(])ge2/" "$f" 2>/dev/null)$'\n'
        errs+=$(grep -nHE '^[[:space:]]*@layer[^{;]*,[^{;]*;' "$f" 2>/dev/null | sed 's/$/  (layer order belongs in the root sheet)/')$'\n'
        # module entries: css/<name>.css that nothing imports
        [[ $f == "$dir"/css/*.css && $f != "$dir"/css/*/* ]] || continue
        name=$(basename "$f" .css)
        [ "$name" = vars-overrides ] && continue
        grep -qxF "$(realpath -m "$f")" <<<"$imported" && continue
        css_imports "$f" | grep -qxF "../$(basename "$root")" ||
            errs+="$f: does not @import url('../$(basename "$root")')"$'\n'
        [ -f "$dir/js/$name.js" ] || warns+="$f: no js/$name.js"$'\n'
    done < <(files "$dir" -name '*.css' | grep -v "/css/$UPSTREAM/")
    hits "module stylesheets" FAIL "$(grep -v '^$' <<<"$errs")"
    hits "module css/js mirror" WARN "$(grep -v '^$' <<<"$warns")"
}

check_paths() {
    hits "root-absolute paths / hardcoded host" FAIL "$( {
        files "$1" -name '*.html' -o -name '*.php' |
            xargs -r grep -nHiE "\b(src|href|action)[[:space:]]*=[[:space:]]*[\"']/([^/]|[\"'])"
        files "$1" -name '*.js' -o -name '*.mjs' |
            xargs -r grep -nHE "(\bfrom|\bimport\(|\bfetch\()[[:space:]]*['\"\`]/[^/]"
        files "$1" -name '*.css' |
            xargs -r grep -nHE "url\([[:space:]]*['\"]?/[^/*]"
        files "$1" -name '*.html' -o -name '*.php' -o -name '*.js' -o -name '*.mjs' -o -name '*.css' |
            xargs -r grep -nHE '\bhttps?://(localhost|127\.0\.0\.1)\b'
    } 2>/dev/null | grep -vE "$COMMENT")"
}

check_cdn() {
    local all line url unpinned=""
    all=$(files "$1" -name '*.js' -o -name '*.mjs' -o -name '*.css' -o -name '*.html' -o -name '*.php' |
        xargs -r grep -nHE "https?://$CDN" 2>/dev/null | grep -vE "$COMMENT")
    hits "CDN URL outside config.js" FAIL "$(grep -vE '^[^:]*/config\.js:' <<<"$all")"
    while IFS= read -r line; do
        [ -n "$line" ] || continue
        for url in $(grep -oE "https?://$CDN[^'\"\` )]*" <<<"$line"); do
            # npm CDNs pin with @<version>, cdnjs with /libs/<name>/<version>; fonts can't
            grep -qE '@[0-9]|/libs/[^/]+/[0-9]|fonts\.googleapis' <<<"$url" ||
                unpinned+="${line%%:*}: $url"$'\n'
        done
    done <<<"$all"
    hits "unpinned CDN URL" FAIL "${unpinned%$'\n'}"
}

check_core() {
    local dir=$1 d n out=""
    if [ -d "$dir/js/$UPSTREAM" ]; then
        # core imports only itself (config.js and icons-list.js are project-owned)
        out+=$(find "$dir/js/$UPSTREAM" -name '*.js' ! -name config.js ! -name icons-list.js -print0 |
            xargs -0r grep -nHE "(\bfrom|\bimport\()[[:space:]]*['\"\`]" |
            grep -vE "(from|import\()[[:space:]]*['\"\`]\./[^/]+['\"\`]" | grep -vE "$COMMENT")$'\n'
        # and never names a plugin: the dependency runs one way
        for d in "$dir"/ge2-plugins/*/; do
            [ -d "$d" ] || continue
            n=$(basename "$d")
            out+=$(find "$dir/js/$UPSTREAM" -name '*.js' ! -name config.js -print0 |
                xargs -0r grep -nHwF -- "$n" | grep -vE "$COMMENT" | sed "s/\$/  (names plugin $n)/")$'\n'
        done
    fi
    # style.css is the single wiring point
    [ -d "$dir/css/$UPSTREAM" ] &&
        out+=$(find "$dir/css/$UPSTREAM" -name '*.css' -print0 | xargs -0r grep -nHE '^[[:space:]]*@import')
    hits "framework boundary (core imports only itself)" FAIL "$(grep -v '^$' <<<"$out")"
}

check_plugins() {
    local d n f out=""
    for d in "$1"/ge2-plugins/*/; do
        [ -d "$d" ] || continue
        d=${d%/}; n=$(basename "$d")
        for f in readme.md config.js "js/$n.js" "css/$n.css"; do
            [ -f "$d/$f" ] || out+="$d: missing $f"$'\n'
        done
        [ -f "$d/js/$n.js" ] &&
            ! grep -qE '\bexport[[:space:]]+((async[[:space:]]+)?function|const|let)[[:space:]]+init\b|\bexport[[:space:]]*\{[^}]*\binit\b' "$d/js/$n.js" &&
            out+="$d/js/$n.js: no init export"$'\n'
        [ -d "$d/uploads" ] &&
            ! grep -qsE 'engine[[:space:]]+off|Require all denied' "$d/uploads/.htaccess" &&
            out+="$d/uploads: no .htaccess disabling execution"$'\n'
    done
    hits "plugin shape" FAIL "${out%$'\n'}"
    # a plugin writes only inside its own folder — never [root]/media — or it stops being distributable
    hits "plugin paths outside its folder" FAIL "$(files "$1" -path "$1/ge2-plugins/*" -name '*.php' |
        xargs -r grep -nHE "\.\./\.\./|DOCUMENT_ROOT|['\"/]media/" 2>/dev/null |
        grep -vE "$COMMENT" | grep -vE '^[^:]+:[0-9]+:[[:space:]]*#')"
}

check_storage_roots() {
    # one-line heuristic: request data straight into a filesystem call. Validated
    # paths built over several lines don't show here, so this only warns
    hits "request data in a filesystem path (storage roots live in the PHP)" WARN "$(files "$1" -name '*.php' |
        xargs -r grep -nHE '\b(file_put_contents|file_get_contents|fopen|readfile|move_uploaded_file|unlink|mkdir|rmdir|rename|copy|touch|scandir|glob)[[:space:]]*\(' 2>/dev/null |
        grep -E "\\\$_(GET|POST|REQUEST|COOKIE)\b|\\\$_FILES\[[^]]*\]\[['\"]name['\"]\]" |
        grep -vE "$COMMENT" | grep -vE '^[^:]+:[0-9]+:[[:space:]]*#')"
}

check_colors() {
    # token definitions (--x: #fff) are the point of vars*.css; ge2's own css is upstream's business
    hits "hardcoded colours (use var(--token))" WARN "$(files "$1" -name '*.css' |
        grep -vE "/css/$UPSTREAM/|vars-overrides\.css$" |
        xargs -r grep -nHiE '#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch)\(' 2>/dev/null |
        grep -vE '^[^:]+:[0-9]+:[[:space:]]*--[a-z0-9-]+[[:space:]]*:')"
}

if [ $# -gt 0 ]; then
    projects=("$@")
else
    projects=("$UPSTREAM")
    for d in "$ROOT"/*/; do
        p=$(basename "$d")
        [ "$p" = "$UPSTREAM" ] && continue
        [ -d "$d/css/$UPSTREAM" ] || [ -d "$d/js/$UPSTREAM" ] || continue
        projects+=("$p")
    done
fi

for p in "${projects[@]}"; do
    dir="$ROOT/$p"
    [ -d "$dir" ] || { echo "== $p: not found" >&2; fails=$((fails + 1)); continue; }
    echo "== $p"
    [ "$p" = "$UPSTREAM" ] || check_drift "$dir"
    check_entry "$dir"
    check_layers "$dir"
    check_modules "$dir"
    check_core "$dir"
    check_plugins "$dir"
    check_storage_roots "$dir"
    check_paths "$dir"
    check_cdn "$dir"
    check_inline_js "$dir"
    check_storage "$dir"
    check_colors "$dir"
done

echo
if [ "$fails" -gt 0 ]; then
    echo "$fails failing check(s)"
    exit 1
fi
echo "all checks pass"
