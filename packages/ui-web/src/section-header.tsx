type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

/**
 * Header de seção reutilizável.
 * Título + subtítulo opcional + ação opcional.
 */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <div>
        <h2 className="m-0 font-titulo text-base font-normal leading-tight tracking-titulo">
          {title}
        </h2>
        {subtitle && (
          <p className="m-0 mt-1 text-[0.8125rem] text-ink-3">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
