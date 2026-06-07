import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { addStaff, deleteStaff, listStaff, updateStaff } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";
import { ActionButton, Badge, Card, ChipGroup, EmptyState, Field, PrimaryButton, Screen } from "@/ui/components";
import { confirm } from "@/ui/dialog";
import { colors, fontSize } from "@/ui/theme";

const roles: StaffRole[] = ["manager", "cashier", "inventory"];

export default function StaffScreen() {
  const isFocused = useIsFocused();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (isFocused) {
      listStaff().then(setStaff);
    }
  }, [isFocused]);

  const canSave = name.trim().length > 1 && pin.trim().length >= 4;

  function handleEdit(member: StaffMember) {
    router.push(`/staff/${member.id}`);
  }

  function handleToggleActive(member: StaffMember) {
    const action = member.active ? "deactivate" : "activate";
    const verb = action === "deactivate" ? "Deactivate" : "Activate";
    confirm({
      title: `${verb} Staff`,
      message: `Are you sure you want to ${action} "${member.name}"?`,
      confirmText: verb,
      destructive: action === "deactivate"
    }).then((ok) => {
      if (!ok) return;
      updateStaff(member.id, { active: !member.active }).then(() => {
        listStaff().then(setStaff);
      });
    });
  }

  function handleDelete(member: StaffMember) {
    confirm({
      title: "Delete Staff",
      message: `Are you sure you want to delete "${member.name}"? This cannot be undone.`,
      confirmText: "Delete",
      destructive: true
    }).then((ok) => {
      if (!ok) return;
      deleteStaff(member.id).then(() => {
        listStaff().then(setStaff);
      });
    });
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
          <Card>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900" }}>Add staff login</Text>
            <Field label="Staff name" onChangeText={setName} placeholder="Cashier name" value={name} />
            <Text style={{ color: colors.ink, fontSize: fontSize.base, fontWeight: "700" }}>Role</Text>
            <ChipGroup
              items={roles}
              selected={role}
              onSelect={setRole}
              labelFn={(r) => r.charAt(0).toUpperCase() + r.slice(1)}
            />
            <Field keyboardType="number-pad" label="PIN" onChangeText={setPin} secureTextEntry value={pin} />
            <PrimaryButton
              disabled={!canSave}
              onPress={async () => {
                await addStaff({ name: name.trim(), role, pin: pin.trim() });
                setName("");
                setRole("cashier");
                setPin("");
                listStaff().then(setStaff);
              }}
              title="Create staff login"
            />
          </Card>

          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900" }}>Team ({staff.length})</Text>
            {staff.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No staff yet"
                subtitle="Add your first team member above."
              />
            ) : (
              staff.map((member) => (
                <Card key={member.id}>
                  <Pressable onPress={() => handleEdit(member)}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: colors.ink, fontSize: fontSize.lg, fontWeight: "900" }}>{member.name}</Text>
                        <Text style={{ color: colors.muted, textTransform: "capitalize" }}>{member.role}</Text>
                      </View>
                      <Badge
                        label={member.active ? "Active" : "Inactive"}
                        tone={member.active ? "success" : "muted"}
                      />
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <ActionButton onPress={() => handleEdit(member)} title="Edit" />
                    <ActionButton onPress={() => handleToggleActive(member)} title={member.active ? "Deactivate" : "Activate"} />
                    <ActionButton onPress={() => handleDelete(member)} title="Delete" variant="destructive" />
                  </View>
                </Card>
              ))
            )}
          </View>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}