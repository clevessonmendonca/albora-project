import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva } from "./variants";

const buttonVariants = cva({
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pilula font-medium cursor-pointer transition-[transform,opacity,border-color,color] duration-[var(--tempo-rapido)] ease-[var(--curva)] active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none",
  variants: {
    variant: {
      primary: "bg-acento text-sobre-acento shadow-suave hover:opacity-90",
      secondary: "bg-transparent text-ink border border-linha hover:border-acento-texto",
      ghost: "bg-transparent text-ink-2 hover:text-ink",
    },
    size: {
      sm: "min-h-9 px-4 text-sm",
      md: "min-h-11 px-6",
      lg: "min-h-[3.375rem] px-7 text-[1.0625rem]",
    },
    width: {
      auto: "",
      full: "w-full",
    },
  },
  defaultVariants: { variant: "primary", size: "md", width: "auto" },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  width?: "auto" | "full";
  children: ReactNode;
};

export function Button({ variant, size, width, className, children, ...rest }: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size, width, className })} {...rest}>
      {children}
    </button>
  );
}
