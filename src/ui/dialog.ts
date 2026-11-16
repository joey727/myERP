import { Platform } from "react-native";

export type ToastTone = "default" | "success" | "danger";

export type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
};

export type ToastItem = ToastInput & { id: number };

export type ConfirmInput = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export type ConfirmRequest = ConfirmInput & {
  id: number;
  resolve: (value: boolean) => void;
};

let sequence = 0;
const toastListeners = new Set<(toast: ToastItem) => void>();
let confirmListener: ((request: ConfirmRequest) => void) | null = null;

export function notify(input: ToastInput): void {
  const item: ToastItem = { id: ++sequence, tone: "default", ...input };
  if (toastListeners.size === 0) {
    if (Platform.OS === "web" && typeof globalThis.alert === "function") {
      globalThis.alert(`${item.title}${item.message ? `\n\n${item.message}` : ""}`);
    }
    return;
  }
  toastListeners.forEach((listener) => listener(item));
}

export function subscribeToasts(listener: (toast: ToastItem) => void) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function confirm(input: ConfirmInput): Promise<boolean> {
  return new Promise((resolve) => {
    if (!confirmListener) {
      if (Platform.OS === "web" && typeof globalThis.confirm === "function") {
        resolve(
          globalThis.confirm(`${input.title}\n\n${input.message}`)
        );
      } else {
        resolve(false);
      }
      return;
    }
    confirmListener({ ...input, id: ++sequence, resolve });
  });
}

export function subscribeToConfirm(listener: (request: ConfirmRequest) => void) {
  confirmListener = listener;
  return () => {
    if (confirmListener === listener) confirmListener = null;
  };
}
