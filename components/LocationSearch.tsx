"use client";
import { useEffect, useRef, useState } from "react";
import { Search, X, LoaderCircle } from "lucide-react";
import type { LocationResult } from "@/lib/geocoding/provider";
import type { SelectedLocation } from "@/lib/geocoding/validate";
export default function LocationSearch({
  id,
  label,
  text,
  selected,
  disabled,
  onChange,
  onSelect,
}: {
  id: string;
  label: string;
  text: string;
  selected: SelectedLocation | null;
  disabled: boolean;
  onChange: (text: string) => void;
  onSelect: (location: LocationResult) => void;
}) {
  const [results, setResults] = useState<LocationResult[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [active, setActive] = useState(-1);
  const cache = useRef(new Map<string, LocationResult[]>()),
    generation = useRef(0),
    input = useRef<HTMLInputElement>(null),
    focused = useRef(false),
    dismissed = useRef(false);
  useEffect(() => {
    const version = ++generation.current;
    if (selected || text.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        let found = cache.current.get(text.toLowerCase());
        if (!found) {
          const response = await fetch(
            `/api/locations?q=${encodeURIComponent(text.trim())}`,
            {
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(15000),
              ]),
            },
          );
          const body = await response.json().catch(() => {
            throw new Error(
              "Location search is temporarily unavailable. Please try again.",
            );
          });
          if (!response.ok)
            throw new Error(body?.error ?? "Location search is unavailable.");
          if (!Array.isArray(body?.results))
            throw new Error(
              "Location search is temporarily unavailable. Please try again.",
            );
          found = body.results as LocationResult[];
          if (cache.current.size >= 50)
            cache.current.delete(cache.current.keys().next().value!);
          cache.current.set(text.toLowerCase(), found);
        }
        if (generation.current !== version) return;
        setResults(found);
        setOpen(focused.current && !dismissed.current);
        setMessage(
          found.length
            ? "Choose a suggestion to confirm the location."
            : "No matching supported locations. Try a street address or another place name. PathSafe currently supports locations within Bentonville, Arkansas.",
        );
      } catch (e) {
        if (!controller.signal.aborted && generation.current === version)
          setMessage(
            e instanceof Error
              ? e.message
              : "Location search timed out. Please try again.",
          );
      } finally {
        if (generation.current === version) setBusy(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, selected]);
  function choose(item: LocationResult) {
    generation.current++;
    setBusy(false);
    onSelect(item);
    setOpen(false);
    setResults([]);
    setMessage("");
    setActive(-1);
    input.current?.focus();
  }
  const searching = busy && !selected;
  return (
    <div className="location-search">
      <label htmlFor={id}>{label}</label>
      <div className="location-input">
        <Search size={15} aria-hidden="true" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !selected && results.length > 0}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            open && !selected && active >= 0
              ? `${id}-option-${active}`
              : undefined
          }
          aria-describedby={`${id}-status`}
          value={text}
          disabled={disabled}
          required
          autoComplete="off"
          placeholder="Search a Bentonville place or address"
          onChange={(e) => {
            // Editing invalidates the previous selection before another response can arrive.
            generation.current++;
            dismissed.current = false;
            setActive(-1);
            setResults([]);
            setMessage("");
            setBusy(false);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            focused.current = true;
            dismissed.current = false;
            if (results.length) setOpen(true);
          }}
          onBlur={() => {
            focused.current = false;
            setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              dismissed.current = true;
              setOpen(false);
              return;
            }
            if (
              (e.key === "ArrowDown" || e.key === "ArrowUp") &&
              results.length
            ) {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                e.key === "ArrowDown"
                  ? (i + 1) % results.length
                  : i <= 0
                    ? results.length - 1
                    : i - 1,
              );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (active >= 0 && results[active]) choose(results[active]);
            }
          }}
        />
        {searching ? (
          <LoaderCircle
            size={15}
            className="spin"
            aria-label="Searching locations"
          />
        ) : (
          text && (
            <button
              type="button"
              className="clear-location"
              aria-label={`Clear ${label.toLowerCase()}`}
              disabled={disabled}
              onClick={() => {
                generation.current++;
                onChange("");
                setResults([]);
                setMessage("");
                input.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          )
        )}
      </div>
      <div
        id={`${id}-options`}
        role="listbox"
        aria-label={`${label} suggestions`}
        hidden={!!selected || !open || !results.length}
        className="location-options"
      >
        {results.map((item, i) => (
          <div
            id={`${id}-option-${i}`}
            key={item.id}
            role="option"
            aria-selected={i === active}
            className={i === active ? "active" : ""}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(item)}
          >
            <strong>{item.label}</strong>
            <span>{item.address} · Bentonville</span>
          </div>
        ))}
      </div>
      <p id={`${id}-status`} className="location-status" role="status">
        {searching
          ? "Searching locations…"
          : selected
            ? `Selected: ${selected.label}`
            : message ||
              "Type at least 3 characters, then select a suggestion."}
      </p>
    </div>
  );
}
