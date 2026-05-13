import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";

import { getStaffByPin } from "@/db/database";
import type { StaffMember } from "@/db/types";

const SESSION_KEY = "myerp_session_staff_id";
const SESSION_TIMEOUT_MS = 60000;

let currentStaffId: number | null = null;
let lastActiveTime = 0;
const listeners = new Set<(id: number | null) => void>();

function notifyListeners() {
  listeners.forEach((l) => l(currentStaffId));
}

async function initializeSession(): Promise<StaffMember | null> {
  try {
    const storedId = await SecureStore.getItemAsync(SESSION_KEY);
    if (storedId) {
      currentStaffId = parseInt(storedId, 10);
      lastActiveTime = Date.now();
      notifyListeners();
      return { id: currentStaffId } as StaffMember;
    }
  } catch {
  }
  return null;
}

export async function login(pin: string): Promise<StaffMember | null> {
  const staff = await getStaffByPin(pin.trim());
  if (staff && staff.active) {
    currentStaffId = staff.id;
    lastActiveTime = Date.now();
    await SecureStore.setItemAsync(SESSION_KEY, String(staff.id));
    notifyListeners();
    return staff;
  }
  return null;
}

async function logout(): Promise<void> {
  currentStaffId = null;
  lastActiveTime = 0;
  await SecureStore.deleteItemAsync(SESSION_KEY);
  notifyListeners();
}

function getCurrentStaffId(): number | null {
  return currentStaffId;
}

function isSessionValid(): boolean {
  if (!currentStaffId) return false;
  return Date.now() - lastActiveTime < SESSION_TIMEOUT_MS;
}

export function useSession() {
  const [staffId, setStaffId] = useState<number | null>(currentStaffId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const handler = (id: number | null) => {
      if (mounted) {
        setStaffId(id);
        setLoading(false);
      }
    };

    listeners.add(handler);

    initializeSession().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      listeners.delete(handler);
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        if (currentStaffId && Date.now() - lastActiveTime > SESSION_TIMEOUT_MS) {
          logout();
        } else if (currentStaffId) {
          lastActiveTime = Date.now();
          setStaffId(currentStaffId);
        }
      } else if (nextState === "background") {
        lastActiveTime = Date.now();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return { staffId, loading };
}