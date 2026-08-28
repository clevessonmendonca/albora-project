/**
 * Wall Use Cases
 * 
 * Casos de uso do telão: authorize, pair, panic.
 */

export {
  toggleWallPanic,
  type ToggleWallPanicInput,
  type ToggleWallPanicOutput,
} from "./toggle-wall-panic";

export {
  authorizeWallPairing,
  type AuthorizeWallPairingInput,
  type AuthorizeWallPairingResult,
} from "./authorize-wall-pairing";

export {
  createWallPairing,
  type CreateWallPairingOutput,
  PAIRING_TTL_SECONDS,
} from "./create-wall-pairing";

export {
  pollWallPairing,
  type PollWallPairingInput,
  type PollWallPairingResult,
  VALIDADE_DA_PAREDE_HORAS,
} from "./poll-wall-pairing";

export {
  getWallTheme,
  type GetWallThemeInput,
  type GetWallThemeOutput,
} from "./get-wall-theme";
