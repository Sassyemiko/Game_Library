import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  filterGenreSuggestions,
  mergeGenreSuggestions,
  saveCustomGenre,
} from "@/lib/genres";
import { cn } from "@/lib/utils";

interface GenreInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Genres already used in the user's library (for autofill). */
  libraryGenres?: string[];
  placeholder?: string;
  className?: string;
}

export function GenreInput({
  value,
  onChange,
  libraryGenres = [],
  placeholder = "Type a genre...",
  className,
}: GenreInputProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const allGenres = React.useMemo(
    () => mergeGenreSuggestions(...libraryGenres, value),
    [libraryGenres, value],
  );

  const matches = React.useMemo(
    () => filterGenreSuggestions(value, allGenres),
    [value, allGenres],
  );

  const trimmed = value.trim();
  const hasExactMatch =
    trimmed.length > 0 &&
    allGenres.some((g) => g.toLowerCase() === trimmed.toLowerCase());

  const showCustomOption = trimmed.length > 0 && !hasExactMatch;

  const options = React.useMemo(() => {
    const list = [...matches];
    if (showCustomOption) {
      const custom = trimmed;
      if (!list.some((g) => g.toLowerCase() === custom.toLowerCase())) {
        list.unshift(custom);
      }
    }
    return list;
  }, [matches, showCustomOption, trimmed]);

  const commitGenre = React.useCallback(
    (genre: string) => {
      const next = genre.trim();
      onChange(next);
      if (next) saveCustomGenre(next);
      setShowSuggestions(false);
      setHighlightIndex(0);
    },
    [onChange],
  );

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [value, options.length]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBlur = () => {
    if (trimmed) commitGenre(trimmed);
    else setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || options.length === 0) {
      if (e.key === "Enter" && trimmed) {
        e.preventDefault();
        commitGenre(trimmed);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % options.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + options.length) % options.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      commitGenre(options[highlightIndex] ?? trimmed);
      return;
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="bg-background/50 border-white/10"
        autoComplete="off"
      />
      {showSuggestions && options.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map((genre, index) => {
            const isCustomRow =
              showCustomOption && index === 0 && genre.toLowerCase() === trimmed.toLowerCase();
            const isActive = index === highlightIndex;

            return (
              <button
                key={`${genre}-${index}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitGenre(genre);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition",
                  isActive && "bg-primary/10 text-primary",
                  isCustomRow && "border-b border-white/5 text-muted-foreground",
                )}
              >
                {isCustomRow ? (
                  <>
                    Use <span className="text-foreground font-medium">&quot;{genre}&quot;</span>
                  </>
                ) : (
                  genre
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
