"use client";

type NewPhotosButtonProps = {
  onClick: () => void;
};

export function NewPhotosButton({ onClick }: NewPhotosButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="feed-pill fixed left-1/2 top-16 z-30 flex cursor-pointer items-center gap-1.5 rounded-pilula border-none bg-acento px-4 py-2 text-[0.8125rem] text-sobre-acento shadow-md"
    >
      ↑ Novas fotos
    </button>
  );
}
