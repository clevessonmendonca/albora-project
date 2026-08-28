"use client";

type LightboxNavButtonsProps = {
  onPrevious: () => void;
  onNext: () => void;
};

export function LightboxNavButtons({ onPrevious, onNext }: LightboxNavButtonsProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Foto anterior"
        className="absolute top-16 bottom-0 left-0 w-1/3 cursor-pointer border-0 bg-transparent"
        onClick={(ev) => {
          ev.stopPropagation();
          onPrevious();
        }}
      />
      <button
        type="button"
        aria-label="Próxima foto"
        className="absolute top-16 bottom-0 right-0 w-1/3 cursor-pointer border-0 bg-transparent"
        onClick={(ev) => {
          ev.stopPropagation();
          onNext();
        }}
      />
    </>
  );
}
