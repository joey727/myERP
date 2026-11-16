import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { addStaff, listStaff } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";
import { notify } from "@/ui/dialog";
import { createStyles, useResponsive } from "@/ui/design";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  ListRow,
  PageHeader,
  Screen,
  Segmented,
  Sheet,
  Skeleton,
  Surface,
  useBottomNavSpace
} from "@/ui/primitives";

export default function StaffScreen() {
  const styles = useStaffStyles();
  const { isCompact } = useResponsive();
  const { staffRole } = useSession();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canCreate = canAccess(role, "staff:create");
  const canEdit = canAccess(role, "staff:edit");
  const isFocused = useIsFocused();
  const bottomSpace = useBottomNavSpace();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!isFocused) return;
    listStaff()
      .then(setStaff)
      .catch((error) => console.error("Staff load failed:", error))
      .finally(() => setLoading(false));
  }, [isFocused]);

  const activeCount = staff.filter((member) => member.active).length;
  const canSave = name.trim().length > 1 && pin.trim().length === 4;

  async function createStaff() {
    if (!canSave) return;
    setSaving(true);
    try {
      await addStaff({ name: name.trim(), role: selectedRole, pin: pin.trim() });
      setName("");
      setSelectedRole("cashier");
      setPin("");
      setSheetOpen(false);
      setStaff(await listStaff());
      notify({ title: "Staff login created", tone: "success" });
    } catch (error) {
      notify({
        title: "Could not create login",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen bottomSpace={bottomSpace} maxWidth={isCompact ? 900 : 1000} safeTop>
      <PageHeader
        right={
          canCreate ? (
            <Button
              icon="add"
              onPress={() => setSheetOpen(true)}
              size="sm"
              title="Add"
            />
          ) : undefined
        }
        subtitle={`${staff.length} login${staff.length === 1 ? "" : "s"} · ${activeCount} active`}
        title="Team"
      />

      {loading ? (
        <View style={styles.loading}>
          <Skeleton height={64} radius={12} />
          <Skeleton height={64} radius={12} />
        </View>
      ) : staff.length === 0 ? (
        <EmptyState
          action={
            canCreate ? (
              <Button
                onPress={() => setSheetOpen(true)}
                title="Add a team login"
                variant="secondary"
              />
            ) : undefined
          }
          icon="people-outline"
          message="Give each person their own PIN so sales are attributed correctly."
          title="No team logins yet"
        />
      ) : (
        <Surface padded={false}>
          {staff.map((member, index) => (
            <View key={member.id} style={styles.rowPad}>
              <ListRow
                divider={index < staff.length - 1}
                onPress={canEdit ? () => router.push(`/staff/${member.id}`) : undefined}
                right={
                  <Badge
                    label={member.active ? "Active" : "Inactive"}
                    tone={member.active ? "success" : "neutral"}
                  />
                }
                showChevron={canEdit}
              >
                <View style={styles.rowContent}>
                  <Avatar name={member.name} size={40} />
                  <View style={styles.rowText}>
                    <AppText variant="bodyStrong">{member.name}</AppText>
                    <AppText style={styles.capitalize} tone="secondary" variant="small">
                      {member.role}
                    </AppText>
                  </View>
                </View>
              </ListRow>
            </View>
          ))}
        </Surface>
      )}

      <View style={styles.note}>
        <AppText tone="secondary" variant="small">
          Owners and managers can change PINs, roles and active status. Cashiers
          only use the till.
        </AppText>
      </View>

      <Sheet
        description="They can sign in with this PIN immediately."
        footer={
          <Button
            disabled={!canSave}
            fullWidth
            haptic
            loading={saving}
            onPress={createStaff}
            title="Create login"
          />
        }
        onClose={() => setSheetOpen(false)}
        title="Add team login"
        visible={sheetOpen}
      >
        <Field
          autoFocus
          label="Full name"
          onChangeText={setName}
          placeholder="Ama Boateng"
          value={name}
        />
        <View style={styles.fieldGap}>
          <AppText tone="secondary" variant="label">
            Role
          </AppText>
          <Segmented
            onChange={setSelectedRole}
            options={[
              { label: "Cashier", value: "cashier" as StaffRole },
              { label: "Manager", value: "manager" as StaffRole }
            ]}
            value={selectedRole}
          />
          <AppText tone="muted" variant="caption">
            Cashiers take sales. Managers also manage stock, staff and customers.
          </AppText>
        </View>
        <Field
          hint="4 digits"
          keyboardType="number-pad"
          label="PIN"
          maxLength={4}
          onChangeText={(value) => setPin(value.replace(/\D/g, ""))}
          placeholder="••••"
          secureTextEntry
          value={pin}
        />
      </Sheet>
    </Screen>
  );
}

const staffStyles = createStyles((theme) => ({
  loading: { gap: theme.space.xs },
  rowPad: { paddingHorizontal: theme.space.md },
  rowContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.sm
  },
  rowText: { flex: 1, gap: 1 },
  capitalize: { textTransform: "capitalize" },
  note: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    padding: theme.space.md
  },
  fieldGap: { gap: theme.space.xs }
}));
const useStaffStyles = () => staffStyles();
