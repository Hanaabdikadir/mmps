"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<ComponentProps<"input">, "type">;

/**
 * Native date picker that stays Gregorian / YYYY-MM-DD even when the page
 * language is Somali (html lang=so breaks some browser date widgets).
 */
export function DateInput({ className, ...props }: DateInputProps) {
  return (
    <input
      type="date"
      lang="en-CA"
      {...props}
      className={cn(className)}
    />
  );
}
