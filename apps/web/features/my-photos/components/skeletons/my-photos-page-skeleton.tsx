import {
  GuestHeader,
  GuestShell,
  GuestMain,
} from "@albora/ui-web";

function Block() {
  return (
    <div
      aria-hidden
      className="aspect-square rounded-media bg-ink-skeleton"
    />
  );
}

export function MyPhotosPageSkeleton() {
  return (
    <GuestShell hideStatusBar>
      <GuestMain>
        <GuestHeader title="Minhas fotos" homeHref="#" />
        <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
          {Array.from({ length: 9 }, (_, i) => (
            <li key={i}>
              <Block />
            </li>
          ))}
        </ul>
      </GuestMain>
    </GuestShell>
  );
}
