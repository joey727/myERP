import { useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { getStaffByPin, getStaffById } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";

const SESSION_KEY = "myerp_session_staff_id";
const SESSION_ROLE_KEY = "myerp_session_staff_role";
const SESSION_TIMEOUT_MS = 60000;

let currentStaffId: number | null = null;
let currentStaffRole: StaffRole | null = null;
let lastActiveTime = 0;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

async function getSessionId(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(SESSION_KEY);
}

async function setSessionId(id: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, id);
}

async function deleteSessionId(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function getSessionRole(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(SESSION_ROLE_KEY);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(SESSION_ROLE_KEY);
}

async function setSessionRole(role: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(SESSION_ROLE_KEY, role);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(SESSION_ROLE_KEY, role);
}

async function deleteSessionRole(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(SESSION_ROLE_KEY);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_ROLE_KEY);
}

async function initializeSession(): Promise<StaffMember | null> {
  try {
    const storedId = await getSessionId();
    if (storedId) {
      currentStaffId = parseInt(storedId, 10);
      let storedRole = await getSessionRole();
      if (!storedRole) {
        try {
          const staff = await getStaffById(currentStaffId);
          storedRole = staff?.role ?? null;
          if (storedRole) {
            await setSessionRole(storedRole);
          }
        } catch {
          // database may not be initialized yet
        }
      }
      currentStaffRole = storedRole as StaffRole | null;
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
    currentStaffRole = staff.role;
    lastActiveTime = Date.now();
    await setSessionId(String(staff.id));
    await setSessionRole(staff.role);
    notifyListeners();
    return staff;
  }
  return null;
}

export async function logout(): Promise<void> {
  currentStaffId = null;
  currentStaffRole = null;
  lastActiveTime = 0;
  await deleteSessionId();
  await deleteSessionRole();
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
  const [staffRole, setStaffRole] = useState<StaffRole | null>(currentStaffRole);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handler = () => {
      if (mounted) {
        setStaffId(currentStaffId);
        setStaffRole(currentStaffRole);
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

  return { staffId, staffRole, loading };
}