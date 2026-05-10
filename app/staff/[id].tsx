import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { getStaffById, updateStaff } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";
import { Field, PrimaryButton, Screen, SecondaryButton } from "@/ui/components";
import { colors } from "@/ui/theme";

const roles: StaffRole[] = ["manager", "cashier", "inventory"];

export default function StaffEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<StaffMember | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [id]);

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
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (!member) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>Staff not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
          <Field label="Staff name" onChangeText={setName} placeholder="Staff name" value={name} />
          <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "700", marginTop: 8 }}>Role</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {roles.map((item) => (
              <Text
                key={item}
                onPress={() => setRole(item)}
                style={{
                  backgroundColor: role === item ? colors.primary : "#ffffff",
                  borderColor: role === item ? colors.primary : colors.border,
                  borderRadius: 8,
                  borderWidth: 1,
                  color: role === item ? "#ffffff" : colors.ink,
                  fontWeight: "800",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  textTransform: "capitalize"
                }}
              >
                {item}
              </Text>
            ))}
          </View>
          <Field keyboardType="number-pad" label="PIN" onChangeText={setPin} placeholder="4-6 digit PIN" secureTextEntry value={pin} />

          <PrimaryButton disabled={!canSave} onPress={handleSave} title="Save changes" />
          <SecondaryButton onPress={() => router.back()} title="Cancel" />
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}