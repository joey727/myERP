import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { useSession } from "@/auth/session";
import { canAccess } from "@/auth/permissions";
import { getStaffById, updateStaff } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";
import { Card, ChipGroup, Field, PrimaryButton, Screen, ScreenLoader, SecondaryButton } from "@/ui/components";
import { colors, fontSize } from "@/ui/theme";

const roles: StaffRole[] = ["manager", "cashier", "inventory"];

export default function StaffEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { staffRole } = useSession();
  const currentRole = (staffRole ?? "cashier") as StaffRole;

  const [member, setMember] = useState<StaffMember | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);

  const canEdit = canAccess(currentRole, "staff:edit");

  useEffect(() => {
    if (!canEdit) {
      router.back();
      return;
    }
    const staffId = Number(id);
    if (staffId) {
      getStaffById(staffId).then((m) => {
        if (m) {
          setMember(m);
          setName(m.name);
          setRole(m.role);
          setPin(m.pin);
        }
        setLoading(false);
      });
    }
  }, [id, canEdit, router]);

  const canSave = name.trim().length > 1 && pin.trim().length >= 4;

  async function handleSave() {
    if (!member) return;

    await updateStaff(member.id, {
      name: name.trim(),
      role,
      pin: pin.trim()
    });

    router.back();
  }

  if (loading) {
    return <ScreenLoader message="Loading staff member" />;
  }

  if (!member) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: fontSize.lg }}>Staff not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 4 }}>Edit Staff</Text>
            <Field label="Staff name" onChangeText={setName} placeholder="Staff name" value={name} />
            <Text style={{ color: colors.ink, fontSize: fontSize.base, fontWeight: "700", marginTop: 8 }}>Role</Text>
            <ChipGroup
              items={roles}
              selected={role}
              onSelect={setRole}
              labelFn={(r) => r.charAt(0).toUpperCase() + r.slice(1)}
            />
            <Field keyboardType="number-pad" label="PIN" onChangeText={setPin} placeholder="4-6 digit PIN" secureTextEntry value={pin} />
          </Card>

          <PrimaryButton disabled={!canSave} onPress={handleSave} title="Save changes" />
          <SecondaryButton onPress={() => router.back()} title="Cancel" />
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}