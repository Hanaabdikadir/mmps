"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type RegisterFormSelectOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
  iconClassName?: string;
  rowClassName?: string;
  imageSrc?: string;
};

type RegisterFormSelectProps = {
  id: string;
  value: string;
  placeholder: string;
  panelTitle?: string;
  theme?: "default" | "district" | "livestock";
  showValueIconInTrigger?: boolean;
  options: readonly RegisterFormSelectOption[];
  onChange: (value: string) => void;
  invalid?: boolean;
  /** No left icon gutter — matches admin form inputs. */
  compact?: boolean;
};

const SELECT_THEMES = {
  default: {
    panel:
      "border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white ring-1 ring-slate-100/80",
    header: "border-slate-200/50 bg-slate-50/90",
    headerText: "text-slate-900",
    list: "register-form-select-list bg-white",
    placeholder: "text-slate-500/80",
    rowHover: "bg-slate-50 font-medium text-slate-900",
    rowText: "font-normal text-slate-800",
    defaultIcon: "text-slate-500",
    triggerOpen: "border-slate-400 bg-slate-50/50 ring-2 ring-slate-400/20",
    triggerHover: "hover:border-slate-300 hover:bg-slate-50/40",
    chevronOpen: "text-slate-600",
  },
  district: {
    panel:
      "border-slate-200/90 bg-white ring-1 ring-slate-100/80",
    header: "border-slate-200/50 bg-slate-50/90",
    headerText: "text-slate-900",
    list: "register-form-select-list register-form-select-list-district bg-white",
    placeholder: "text-slate-500/80 italic",
    rowHover: "bg-slate-50 font-medium text-slate-900",
    rowText: "font-normal text-slate-800",
    defaultIcon: "text-red-500",
    triggerOpen: "border-slate-400 bg-slate-50/50 ring-2 ring-slate-400/20",
    triggerHover: "hover:border-slate-300 hover:bg-slate-50/40",
    chevronOpen: "text-slate-600",
  },
  livestock: {
    panel:
      "border-emerald-200 bg-white ring-1 ring-emerald-100/90 shadow-lg shadow-emerald-900/10",
    header: "border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50",
    headerText: "text-emerald-800",
    list: "register-form-select-list bg-white",
    placeholder: "text-emerald-600/70",
    rowHover: "bg-emerald-50 font-semibold text-emerald-950",
    rowText: "font-medium text-emerald-800",
    defaultIcon: "text-teal-600",
    triggerOpen: "border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-400/25",
    triggerHover: "hover:border-emerald-300 hover:bg-emerald-50/40",
    chevronOpen: "text-emerald-600",
  },
} as const;

type ListLayout = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const triggerClass =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white py-2.5 pl-10 pr-3 text-left text-sm text-gray-900 transition hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/20";

const VIEWPORT_MARGIN = 12;
const GAP = 4;
const IDEAL_MAX = 280;
const ROW_HEIGHT = 38;
const LIST_PADDING = 16;
const PANEL_HEADER = 32;

function measureListLayout(
  trigger: HTMLButtonElement,
  itemCount: number
): ListLayout {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const contentHeight = PANEL_HEADER + itemCount * ROW_HEIGHT + LIST_PADDING;
  const openUp =
    spaceBelow < Math.min(contentHeight, 200) && spaceAbove > spaceBelow;
  const available = Math.max(96, (openUp ? spaceAbove : spaceBelow) - GAP);
  const maxHeight = Math.min(contentHeight, available, IDEAL_MAX);

  let left = rect.left;
  const width = rect.width;
  if (left + width > window.innerWidth - VIEWPORT_MARGIN) {
    left = window.innerWidth - VIEWPORT_MARGIN - width;
  }
  left = Math.max(VIEWPORT_MARGIN, left);

  return {
    top: openUp ? rect.top - GAP - maxHeight : rect.bottom + GAP,
    left,
    width,
    maxHeight,
  };
}

export function RegisterFormSelect({
  id,
  value,
  placeholder,
  panelTitle,
  theme = "default",
  showValueIconInTrigger = true,
  options,
  onChange,
  invalid,
  compact = false,
}: RegisterFormSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [layout, setLayout] = useState<ListLayout | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const items: RegisterFormSelectOption[] = [
    { value: "", label: placeholder },
    ...options,
  ];

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? (value ? value : placeholder);
  const selectedOption = options.find((o) => o.value === value);
  const SelectedIcon = selectedOption?.icon;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setLayout(null);
      return;
    }

    const update = () => {
      if (triggerRef.current) {
        setLayout(measureListLayout(triggerRef.current, items.length));
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setActiveIndex(-1);
  }

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        triggerRef.current?.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      }
      return next;
    });
    setActiveIndex(-1);
  }

  const headerLabel = panelTitle ?? placeholder;
  const t = SELECT_THEMES[theme];

  const listPanel =
    open && layout ? (
      <div
        className={cn(
          "register-form-select-panel fixed z-[400] overflow-hidden rounded-xl border",
          t.panel
        )}
        style={{
          top: layout.top,
          left: layout.left,
          width: layout.width,
        }}
      >
        <div className={cn("border-b px-3 py-1.5", t.header)}>
          <p className={cn("truncate text-center text-xs font-semibold tracking-wide", t.headerText)}>
            {headerLabel}
          </p>
        </div>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          style={{ maxHeight: layout.maxHeight - PANEL_HEADER }}
          className={cn("overflow-y-auto overscroll-contain py-1", t.list)}
          onMouseLeave={() => setActiveIndex(-1)}
        >
          {items.map((item, index) => {
            const isPlaceholder = item.value === "";
            const isSelected = value === item.value && !isPlaceholder;
            const isHovered = activeIndex === index && !isPlaceholder;
            const ItemIcon = item.icon;
            return (
              <li key={isPlaceholder ? "__placeholder" : item.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(item.value)}
                  className={cn(
                    "mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    isPlaceholder && t.placeholder,
                    !isPlaceholder &&
                      (item.rowClassName ?? (isHovered ? t.rowHover : t.rowText)),
                    !isPlaceholder && isHovered && item.rowClassName && "brightness-95",
                    isSelected && "ring-1 ring-emerald-400/60"
                  )}
                >
                  {item.imageSrc && !isPlaceholder ? (
                    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/80 bg-white shadow-sm">
                      <Image
                        src={item.imageSrc}
                        alt=""
                        width={56}
                        height={56}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : ItemIcon && !isPlaceholder ? (
                    <ItemIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        item.iconClassName ?? t.defaultIcon
                      )}
                      strokeWidth={2.25}
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={toggleOpen}
          className={cn(
            triggerClass,
            compact && "pl-3 py-2",
            "scroll-mt-24",
            open ? t.triggerOpen : t.triggerHover,
            !value && "font-normal text-gray-500",
            value && "text-gray-900",
            invalid && "border-red-300 ring-1 ring-red-200 focus:ring-red-200"
          )}
          aria-invalid={invalid || undefined}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
            {selectedOption?.imageSrc && value ? (
              <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                <Image
                  src={selectedOption.imageSrc}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </span>
            ) : showValueIconInTrigger && SelectedIcon && value ? (
              <SelectedIcon
                className={cn(
                  "h-4 w-4 shrink-0",
                  selectedOption?.iconClassName ?? t.defaultIcon
                )}
                strokeWidth={2.25}
              />
            ) : null}
            {selectedLabel}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
              open && cn("rotate-180", t.chevronOpen)
            )}
            aria-hidden
          />
        </button>
      </div>

      {typeof document !== "undefined" && listPanel
        ? createPortal(listPanel, document.body)
        : null}
    </>
  );
}
