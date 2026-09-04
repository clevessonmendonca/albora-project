"use client";

type LightboxNavButtonsProps = {
  onPrevious: () => void;
  onNext: () => void;
};

const CLASSE_ZONA =
  "group absolute top-20 bottom-24 z-10 flex w-1/3 cursor-pointer appearance-none items-center border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-acento";

const CLASSE_SETA =
  "grid size-9 place-items-center rounded-full border border-transparent text-ink opacity-0 transition-opacity duration-instantaneo ease-mola [text-shadow:0_1px_4px_var(--bg)] group-hover:opacity-100 group-focus-visible:border-acento group-focus-visible:opacity-100";

export function LightboxNavButtons({ onPrevious, onNext }: LightboxNavButtonsProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Foto anterior"
        className={`${CLASSE_ZONA} left-0 justify-start`}
        onClick={(ev) => {
          ev.stopPropagation();
          onPrevious();
        }}
      >
        <span aria-hidden className={`${CLASSE_SETA} ml-3`}>
          ‹
        </span>
      </button>
      <button
        type="button"
        aria-label="Próxima foto"
        className={`${CLASSE_ZONA} right-0 justify-end`}
        onClick={(ev) => {
          ev.stopPropagation();
          onNext();
        }}
      >
        <span aria-hidden className={`${CLASSE_SETA} mr-3`}>
          ›
        </span>
      </button>
    </>
  );
}
