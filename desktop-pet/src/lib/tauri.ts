import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface PassthroughPayload {
  enabled: boolean;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function dragWindow(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }

  await getCurrentWindow().startDragging();
  return true;
}

export async function minimizeWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await getCurrentWindow().minimize();
}

export async function closeWindow(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await getCurrentWindow().close();
}

export async function setPetPassthrough(enabled: boolean): Promise<boolean> {
  if (!isTauriRuntime()) {
    return enabled;
  }

  return invoke<boolean>("set_pet_passthrough", { enabled });
}

export async function listenToPassthroughChanges(
  handler: (enabled: boolean) => void
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  return listen<PassthroughPayload>("pet://passthrough-changed", (event) => {
    handler(Boolean(event.payload.enabled));
  });
}
