"use client";

import { useEffect, useRef, useState } from "react";

export function usePhotoFlash(photos: number) {
  const photoInitialized = useRef(false);
  const [photoFlash, setPhotoFlash] = useState(false);

  useEffect(() => {
    if (!photoInitialized.current) {
      photoInitialized.current = true;
      return;
    }
    setPhotoFlash(true);
    const t = setTimeout(() => setPhotoFlash(false), 700);
    return () => clearTimeout(t);
  }, [photos]);

  return photoFlash;
}
