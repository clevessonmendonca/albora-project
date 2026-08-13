import {
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
} from "@/app/telas/shell-convidado";
import { AlbumGridLoading } from "../client/album-grid";

export function AlbumPageSkeleton() {
  return (
    <ChaoConvidado semStatus>
      <style>{`
        @keyframes album-respirar {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        .album-esperando { animation: album-respirar 1900ms var(--curva) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .album-esperando { animation: none !important; }
        }
      `}</style>
      <MioloConvidado>
        <CabecalhoConvidado titulo="O álbum" hrefInicio="#" />
        <AlbumGridLoading />
      </MioloConvidado>
    </ChaoConvidado>
  );
}
