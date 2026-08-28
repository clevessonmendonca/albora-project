import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export type OnlineProbe = () => Promise<boolean>;

function onlineFromState(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/** Best-effort — false só quando o SO diz que não há rede. */
export async function estaOnline(probe: OnlineProbe = defaultProbe): Promise<boolean> {
  return probe();
}

async function defaultProbe(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return onlineFromState(state);
}

export function subscribeOnline(onChange: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    onChange(onlineFromState(state));
  });
}

export { onlineFromState };
