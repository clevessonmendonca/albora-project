import { Redirect } from "expo-router";

/** Sem sessão o app só existe para parear. O QR continua na web. */
export default function Index() {
  return <Redirect href="/pair" />;
}
