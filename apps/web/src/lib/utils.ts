import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { legacyTailwindMap } from "./legacy-tailwind-map";

export function cn(...inputs: ClassValue[]) {
  const classes = clsx(inputs);
  const migratedStyles = classes
    .split(/\s+/)
    .map((className) => legacyTailwindMap[className])
    .filter(Boolean);

  return twMerge(classes, ...migratedStyles);
}
