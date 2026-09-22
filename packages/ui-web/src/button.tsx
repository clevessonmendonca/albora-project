import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva } from "./variants";

/**
 * `buttonVariants` é exportado para que `<a>`/`<Link>` usem exatamente o mesmo
 * traço do `<button>` — sem isso o admin recriava as classes à mão e divergia.
 */
/** Terciário e o alias legado `ghost` (nenhum caller usa hoje, mas o valor fica no cva por compatibilidade) compartilham o mesmo tratamento visual. */
const TERCIARIO = "bg-transparent text-acento-texto hover:opacity-80";

export const buttonVariants = cva({
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pilula font-medium no-underline cursor-pointer transition-[transform,opacity,border-color,color] duration-instantaneo ease-mola active:scale-[0.97] disabled:opacity-55 disabled:pointer-events-none",
  variants: {
    variant: {
      primary: "bg-acento text-sobre-acento shadow-suave hover:opacity-90",
      secondary: "bg-transparent text-ink border border-linha hover:border-acento-texto",
      tertiary: TERCIARIO,
      ghost: TERCIARIO,
      danger: "bg-critico text-sobre-acento shadow-suave hover:opacity-90",
    },
    size: {
      sm: "min-h-11 px-4 text-sm",
      md: "min-h-12 px-6",
      lg: "min-h-14 px-7 text-[1.0625rem]",
    },
    width: {
      auto: "",
      full: "w-full",
    },
  },
  defaultVariants: { variant: "primary", size: "md", width: "auto" },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "danger";
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
