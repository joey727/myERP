import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { addStaff, deleteStaff, listStaff, updateStaff } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";
import { Card, Field, PrimaryButton, Screen } from "@/ui/components";
import { colors } from "@/ui/theme";

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
    Alert.alert(
      `${action === "deactivate" ? "Deactivate" : "Activate"} Staff`,
      `Are you sure you want to ${action} "${member.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "deactivate" ? "Deactivate" : "Activate",
          onPress: async () => {
            await updateStaff(member.id, { active: !member.active });
            listStaff().then(setStaff);
          }
        }
      ]
    );
  }

  function handleDelete(member: StaffMember) {
    Alert.alert(
      "Delete Staff",
      `Are you sure you want to delete "${member.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteStaff(member.id);
            listStaff().then(setStaff);
          }
        }
      ]
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
          <Card>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>Add staff login</Text>
            <Field label="Staff name" onChangeText={setName} placeholder="Cashier name" value={name} />
            <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "700" }}>Role</Text>
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
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>Team ({staff.length})</Text>
            {staff.map((member) => (
              <Card key={member.id}>
                <Pressable onPress={() => handleEdit(member)}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900" }}>{member.name}</Text>
                      <Text style={{ color: colors.muted, textTransform: "capitalize" }}>{member.role}</Text>
                    </View>
                    <Text style={{ color: member.active ? colors.success : colors.muted, fontWeight: "900" }}>
                      {member.active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </Pressable>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <Pressable onPress={() => handleEdit(member)} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => handleToggleActive(member)} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>{member.active ? "Deactivate" : "Activate"}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDelete(member)} style={[styles.actionButton, styles.deleteButton]}>
                    <Text style={{ color: colors.warning, fontSize: 13, fontWeight: "700" }}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </View>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700" as const
  },
  deleteButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.warning
  }
};