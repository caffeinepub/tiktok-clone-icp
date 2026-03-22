import { HttpAgent } from "@icp-sdk/core/agent";
import { useEffect, useMemo, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";
import { useInternetIdentity } from "./useInternetIdentity";

export function useStorageClient(bucket: string) {
  const { identity } = useInternetIdentity();
  const [config, setConfig] = useState<{
    storage_gateway_url: string;
    backend_canister_id: string;
    project_id: string;
    backend_host?: string;
  } | null>(null);

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  const storageClient = useMemo(() => {
    if (!config) return null;
    const agent = new HttpAgent({
      identity: identity ?? undefined,
      host: config.backend_host,
    });
    return new StorageClient(
      bucket,
      config.storage_gateway_url,
      config.backend_canister_id,
      config.project_id,
      agent,
    );
  }, [identity, config, bucket]);

  return storageClient;
}
