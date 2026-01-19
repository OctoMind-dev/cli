###-begin-octomind-completion-###
#
# Octomind CLI - Fast Context-Aware Completion Script
# ====================================================
#
# INSTALLATION:
# -------------
# Replace the default tabtab-generated completion script with this optimized version:
#
#   cp scripts/octomind.zsh ~/.config/tabtab/octomind.zsh
#
# Then reload your shell or source the file:
#
#   source ~/.config/tabtab/octomind.zsh
#
# BENEFITS:
# ---------
# This completion script provides significant performance improvements over the standard
# tabtab-generated completion:
#
# 1. Context-Sensitive Caching: Completions are cached per test target and subcommand,
#    providing instant results for repeated operations. Cache automatically refreshes
#    after 1 minute in the background.
#
# 2. Intelligent Fallback: When no CLI-specific completions are available, automatically
#    falls back to standard file completion, making it useful for file path arguments.
#
# 3. Faster Response Time: Initial completions are served from cache, eliminating the
#    delay of spawning the CLI process on every tab press.
#
###-begin-octomind-completion-###
_fast_octomind_completion() {
    local cli_path=$(command -v octomind)
    [[ -z "$cli_path" ]] && return

    local cache_dir="${XDG_CACHE_HOME:-$HOME/.cache}/octomind_cli_cache"
    mkdir -p "$cache_dir"
    
    local config_file="$HOME/.config/octomind.json"
    local context_id="default"
    [[ -f "$config_file" ]] && context_id=$(grep -o '"testTargetId": "[^"]*"' "$config_file" | cut -d'"' -f4)
    
    local current_subcommand="${words[2]:-base}"
    local cache_file="$cache_dir/cache_${context_id}_${current_subcommand}.txt"
    
    local -a results
    local si=$IFS
    IFS=$'\n'

    # 1. Attempt to get results (Cache or CLI)
    if [[ -f "$cache_file" && -s "$cache_file" ]]; then
        results=($(cat "$cache_file"))
        
        if [[ -n $(find "$cache_file" -mmin +1 2>/dev/null) ]]; then
            (COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" \
             "$cli_path" completion -- "${words[@]}" > "$cache_file" 2>/dev/null &)
        fi
    else
        local raw_output
        raw_output=$(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" \
                     "$cli_path" completion -- "${words[@]}")
        
        if [[ -n "$raw_output" ]]; then
            echo "$raw_output" > "$cache_file"
            results=(${(f)raw_output})
        fi
    fi
    IFS=$si

    # 2. Logic Switch: CLI results vs. File Fallback
    if (( ${#results} > 0 )); then
        # We have CLI-specific strings, show them
        _describe 'values' results
    else
        # No CLI results found? Fallback to standard Zsh file completion
        _message "no matching commands; falling back to files"
        _files
    fi
}

if type compdef &>/dev/null; then
  compdef _fast_octomind_completion octomind
fi
###-end-octomind-completion-###