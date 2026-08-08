import { useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { getStaffById, listStaff, updateStaff } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";
import { isPinHashed, verifyPin } from "@/lib/pin";

const SESSION_KEY = "myerp_session_staff_id";
const SESSION_ROLE_KEY = "myerp_session_staff_role";
const SESSION_NAME_KEY = "myerp_session_staff_name";
const INACTIVITY_TIMEOUT_KEY = "myerp_session_inactivity_timeout";

const INACTIVITY_MINUTES_DEFAULT = 60;
export const INACTIVITY_MINUTES_OPTIONS = [0, 15, 30, 60, 480] as const;

let currentStaffId: number | null = null;
let currentStaffRole: StaffRole | null = null;
let currentStaffName: string | null = null;
let lastActiveTime = 0;
let inactivityTimeoutMs: number = INACTIVITY_MINUTES_DEFAULT * 60 * 1000;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

async function writeValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function getSessionId(): Promise<string | null> {
  return readValue(SESSION_KEY);
}

async function getSessionRole(): Promise<string | null> {
  return readValue(SESSION_ROLE_KEY);
}

async function getInactivityTimeoutMinutes(): Promise<number> {
  const stored = await readValue(INACTIVITY_TIMEOUT_KEY);
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : INACTIVITY_MINUTES_DEFAULT;
}

async function initializeSession(): Promise<StaffMember | null> {
  try {
    inactivityTimeoutMs = (await getInactivityTimeoutMinutes()) * 60 * 1000;

    const storedId = await getSessionId();
    let storedRole = storedId ? (await getSessionRole()) as StaffRole | null : null;
    let storedName = storedId ? await readValue(SESSION_NAME_KEY) : null;

    if (storedId) {
      currentStaffId = parseInt(storedId, 10);
      try {
        const staff = await getStaffById(currentStaffId);
        if (staff && staff.active) {
          currentStaffRole = staff.role;
          currentStaffName = staff.name;
          storedRole = staff.role;
          storedName = staff.name;
        }
      } catch {
        // database may not be initialized yet
      }
      currentStaffRole = storedRole ?? null;
      currentStaffName = storedName ?? null;
      lastActiveTime = Date.now();
      notifyListeners();
      return { id: currentStaffId } as StaffMember;
    }
  } catch {
  }
  return null;
}

function setCurrentStaff(staff: StaffMember) {
  currentStaffId = staff.id;
  currentStaffRole = staff.role;
  currentStaffName = staff.name;
  lastActiveTime = Date.now();
}

export async function login(pin: string): Promise<StaffMember | null> {
  const activeStaff = (await listStaff()).filter((member) => member.active);
  for (const member of activeStaff) {
    if (await verifyPin(pin, member.pin)) {
      if (!isPinHashed(member.pin)) {
        await updateStaff(member.id, { pin });
      }
      setCurrentStaff(member);
      await writeValue(SESSION_KEY, String(member.id));
      await writeValue(SESSION_ROLE_KEY, member.role);
      await writeValue(SESSION_NAME_KEY, member.name);
      notifyListeners();
      return member;
    }
  }
  return null;
}

export async function loginStaffById(staffId: number): Promise<StaffMember | null> {
  const staff = await getStaffById(staffId);
  if (!staff || !staff.active) return null;
  setCurrentStaff(staff);
  await writeValue(SESSION_KEY, String(staff.id));
  await writeValue(SESSION_ROLE_KEY, staff.role);
  await writeValue(SESSION_NAME_KEY, staff.name);
  notifyListeners();
  return staff;
}

export function setInactivityTimeout(minutes: number): void {
  inactivityTimeoutMs = minutes * 60 * 1000;
  writeValue(INACTIVITY_TIMEOUT_KEY, String(minutes));
}

export async function getInactivityTimeout(): Promise<number> {
  return getInactivityTimeoutMinutes();
}

async function refreshCurrentStaff() {
  if (!currentStaffId) return;
  try {
    const staff = await getStaffById(currentStaffId);
    if (!staff || !staff.active) {
      await logout();
      return;
    }
    if (staff.role !== currentStaffRole || staff.name !== currentStaffName) {
      currentStaffRole = staff.role;
      currentStaffName = staff.name;
      await writeValue(SESSION_ROLE_KEY, staff.role);
      await writeValue(SESSION_NAME_KEY, staff.name);
      notifyListeners();
    }
  } catch {
    // database not ready yet
  }
}

export async function logout(): Promise<void> {
  currentStaffId = null;
  currentStaffRole = null;
  currentStaffName = null;
  lastActiveTime = 0;
  await deleteValue(SESSION_KEY);
  await deleteValue(SESSION_ROLE_KEY);
  await deleteValue(SESSION_NAME_KEY);
  notifyListeners();
}

export function useSession() {
  const [staffId, setStaffId] = useState<number | null>(currentStaffId);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(currentStaffRole);
  const [staffName, setStaffName] = useState<string | null>(currentStaffName);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const handler = () => {
      if (mounted) {
        setStaffId(currentStaffId);
        setStaffRole(currentStaffRole);
        setStaffName(currentStaffName);
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
        if (currentStaffId && inactivityTimeoutMs > 0 && Date.now() - lastActiveTime > inactivityTimeoutMs) {
          logout();
        } else if (currentStaffId) {
          lastActiveTime = Date.now();
          setStaffId(currentStaffId);
          refreshCurrentStaff();
        }
      } else if (nextState === "background") {
        lastActiveTime = Date.now();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return { staffId, staffRole, staffName, loading };
}