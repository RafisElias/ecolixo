import { useEffect, useRef, useState } from "react";
import type { Category } from "../types";

interface MultiSelectProps {
  options: Category[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

export default function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Selecione…",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedOptions = options.filter((o) => selected.includes(o.id));

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      {/* Gatilho */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 4,
          minHeight: 42,
          padding: "6px 32px 6px 12px",
          border: "1.5px solid var(--border)",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
          background: "#fff",
          position: "relative",
        }}
      >
        {selectedOptions.length === 0 && <span style={{ color: "#9e9e9e" }}>{placeholder}</span>}
        {selectedOptions.map((opt) => (
          <span
            key={opt.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              background: `${opt.map_color}22`,
              color: opt.map_color,
              border: `1px solid ${opt.map_color}44`,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: opt.map_color,
                display: "inline-block",
              }}
            />
            {opt.name}
          </span>
        ))}
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            fontSize: 10,
            color: "#9e9e9e",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            marginTop: 4,
            background: "#fff",
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            return (
              <div
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  const next = isSelected
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id];
                  onChange(next);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isSelected ? "#e8f5e9" : "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isSelected ? "#f0fdf4" : "transparent";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: 14,
                  background: isSelected ? "#f0fdf4" : "transparent",
                  borderBottom: "1px solid #f0f0f0",
                  userSelect: "none",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${isSelected ? opt.map_color : "#bdbdbd"}`,
                    background: isSelected ? opt.map_color : "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  {isSelected && (
                    <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>
                  )}
                </span>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: opt.map_color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {opt.name}
              </div>
            );
          })}
          {options.length === 0 && (
            <div style={{ padding: 14, color: "var(--text-muted)", fontSize: 13 }}>
              Nenhuma opção disponível
            </div>
          )}
        </div>
      )}
    </div>
  );
}
