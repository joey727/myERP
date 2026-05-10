import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as SecureStore from "expo-secure-store";

import { getStaffByPin } from "@/db/database";
import type { StaffMember } from "@/db/types";

const SESSION_KEY = "myerp_session_staff_id";
const SESSION_TIMEOUT_MS = 60000;

let currentStaffId: number | null = null;
let lastActiveTime = 0;

export async function initializeSession(): Promise<StaffMember | null> {
  try {
    const storedId = await SecureStore.getItemAsync(SESSION_KEY);
    if (storedId) {
      currentStaffId = parseInt(storedId, 10);
      lastActiveTime = Date.now();
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
    return staff;
  }
  return null;
}

export async function logout(): Promise<void> {
  currentStaffId = null;
  lastActiveTime = 0;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function getCurrentStaffId(): number | null {
  return currentStaffId;
}

export function isSessionValid(): boolean {
  if (!currentStaffId) return false;
  return Date.now() - lastActiveTime < SESSION_TIMEOUT_MS;
}

export function useSession() {
  const [staffId, setStaffId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSession().then(() => {
      setStaffId(currentStaffId);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        if (currentStaffId && Date.now() - lastActiveTime > SESSION_TIMEOUT_MS) {
          logout().then(() => {
            setStaffId(null);
          });
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