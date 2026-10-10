#!/usr/bin/env bash
# ge2-check.sh — check every ge2-based project against the same rules.
# Read-only: it reports, it never fixes. Lives beside sync-ge2.sh.
#
# Checks (FAIL = breaks a ge2 rule, WARN = worth a look):
#   drift      css/ge2/, js/ge2/ differ from upstream          FAIL
#   layers     root stylesheet declares the ge2 layer order     FAIL
#   inline-js  inline <script> or on*= handlers in html/php     FAIL
#   storage    raw localStorage outside js/ge2/store.js         FAIL
#   colors     hardcoded colours outside token definitions      WARN
#
# <project>/.ge2-check-ignore lists paths (relative, one per line) to skip,
# for third-party code the project doesn't own — e.g. a bundled wiki.
#
# Usage: ./ge2-check.sh [project...]   (default: ge2 + every synced project)
# Exit:  1 if any FAIL, else 0.

set -uo pipefail

ROOT=/var/www/dash
UPSTREAM=ge2
LAYERS='@layer units, base, ui, plugin, page, utils;'
SHOW=5          # matches printed per check
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

check_layers() {
    # the root stylesheet: style.css, or <project>.css where a project names it so (fm)
    local css=$1/style.css
    [ -f "$css" ] || css=$1/$(basename "$1").css
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
    check_layers "$dir"
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
