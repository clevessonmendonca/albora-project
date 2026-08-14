import { texto, type Pack } from "@albora/packs";
import {
  ConsentCheckbox,
  DisplayTitle,
  EntryColumn,
  EventLabel,
  FinePrint,
  PrimaryButton,
  SecondaryText,
  StatusBar,
  TextLink,
} from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function EntryScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground fundo="escuro" pack={pack}>
      <StatusBar />
      <EntryColumn>
        <div>
          <EventLabel>{texto(pack, "landing.exemplo.nome")}</EventLabel>
          <DisplayTitle>{texto(pack, "convidado.saudacao")}</DisplayTitle>
          <SecondaryText>Como você quer aparecer nas fotos que enviar?</SecondaryText>
        </div>

        <div className="rounded-token border-b-2 border-acento bg-superficie px-[1.125rem] py-[1.0625rem] font-titulo text-[1.375rem]">
          Bia
          <span className="text-acento">|</span>
        </div>

        <ConsentCheckbox checked>
          Concordo que as fotos que eu enviar apareçam para quem está nesta festa.{" "}
          <TextLink>Ler o texto completo</TextLink>
        </ConsentCheckbox>

        <PrimaryButton disabled>Fotografar</PrimaryButton>

        <FinePrint>Sem cadastro, sem senha e sem baixar nada</FinePrint>
      </EntryColumn>
    </GuestBackground>
  );
}
