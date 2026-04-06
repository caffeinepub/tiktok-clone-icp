import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";
export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<backendInterface | null>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const isAuthenticated = !!identity;

      try {
        if (!isAuthenticated) {
          // Return anonymous actor if not authenticated
          const anonActor = await createActorWithConfig();
          return anonActor;
        }

        const actorOptions = {
          agentOptions: {
            identity,
          },
        };

        const actor = await createActorWithConfig(actorOptions);

        // Try to initialize access control, but never let it block actor creation
        try {
          const adminToken = getSecretParameter("caffeineAdminToken") || "";
          await actor._initializeAccessControlWithSecret(adminToken);
        } catch {
          // Ignore initialization errors — actor is still usable
        }

        return actor;
      } catch {
        // If actor creation fails, retry once after a delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          if (!isAuthenticated) {
            return await createActorWithConfig();
          }
          const retryActor = await createActorWithConfig({
            agentOptions: { identity },
          });
          try {
            const adminToken = getSecretParameter("caffeineAdminToken") || "";
            await retryActor._initializeAccessControlWithSecret(adminToken);
          } catch {
            // Ignore
          }
          return retryActor;
        } catch {
          return null;
        }
      }
    },
    // Only refetch when identity changes
    staleTime: Number.POSITIVE_INFINITY,
    // This will cause the actor to be recreated when the identity changes
    enabled: true,
  });

  // When the actor changes, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
