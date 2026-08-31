export type ClassValue = string | false | null | undefined;

export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Longhand border-radius for inline styles when Tailwind tokens are not enough. */
export function radiusStyle(value: string): {
  borderTopLeftRadius: string;
  borderTopRightRadius: string;
  borderBottomLeftRadius: string;
  borderBottomRightRadius: string;
} {
  return {
    borderTopLeftRadius: value,
    borderTopRightRadius: value,
    borderBottomLeftRadius: value,
    borderBottomRightRadius: value,
  };
}

type VariantTables = Record<string, Record<string, string>>;
type VariantSelection<V extends VariantTables> = { [K in keyof V]?: keyof V[K] | undefined };

type CvaConfig<V extends VariantTables> = {
  base?: string;
  variants?: V;
  defaultVariants?: VariantSelection<V>;
};

type CvaProps<V extends VariantTables> = VariantSelection<V> & { className?: string | undefined };

export function cva<V extends VariantTables>(config: CvaConfig<V>) {
  const { base, variants: tables, defaultVariants } = config;

  return (props: CvaProps<V> = {}): string => {
    const parts: ClassValue[] = [base];

    if (tables) {
      for (const key of Object.keys(tables) as (keyof V)[]) {
        const choice = (props[key] ?? defaultVariants?.[key]) as keyof V[keyof V] | undefined;
        if (choice != null) {
          parts.push((tables[key] as Record<string, string>)[choice as string]);
        }
      }
    }

    parts.push(props.className);
    return cn(...parts);
  };
}
