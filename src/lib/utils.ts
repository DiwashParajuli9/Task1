import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function truncate(text: string, max = 60) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
