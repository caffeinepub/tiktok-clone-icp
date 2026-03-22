import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useBackend() {
  const { actor, isFetching } = useActor();
  const { identity, login } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backend = actor as any;
  return { backend, isFetching, isLoggedIn, login, identity };
}
