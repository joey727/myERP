import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { canAccess } from "@/auth/permissions";
import { useSession } from "@/auth/session";
import { deleteStaff, getStaffById, updateStaff } from "@/db/database";
import type { StaffMember, StaffRole } from "@/db/types";
import { confirm, notify } from "@/ui/dialog";
import { createStyles, useResponsive } from "@/ui/design";
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Field,
  PageHeader,
  Screen,
  Segmented,
  Skeleton,
  Surface
} from "@/ui/primitives";

export default function StaffEditScreen() {
  const styles = useStaffDetailStyles();
  const { isCompact } = useResponsive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { staffRole, staffId } = useSession();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canEdit = canAccess(role, "staff:edit");
  const canDelete = canAccess(role, "staff:delete");

  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!canEdit) {
      router.back();
      return;
    }
    const staffMemberId = Number(id);
    if (staffMemberId) {
      getStaffById(staffMemberId)
        .then((next) => {
          if (next) {
            setMember(next);
            setName(next.name);
            setSelectedRole(next.role);
          }
        })
        .catch((error) => console.error("Staff load failed:", error))
        .finally(() => setLoading(false));
    }
  }, [id, canEdit]);

  async function save() {
    if (!member) return;
    setSaving(true);
    try {
      await updateStaff(member.id, {
        name: name.trim(),
        role: selectedRole,
        pin: pin.trim() || undefined
      });
      notify({ title: "Staff member saved", tone: "success" });
      router.back();
    } catch (error) {
      notify({
        title: "Could not save",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!member) return;
    const ok = await confirm({
      title: member.active ? "Deactivate login" : "Activate login",
      message: member.active
        ? `${member.name} will not be able to sign in until reactivated.`
        : `${member.name} will be able to sign in again.`,
      confirmText: member.active ? "Deactivate" : "Activate",
      destructive: member.active
    });
    if (!ok) return;
    await updateStaff(member.id, { active: !member.active });
    setMember({ ...member, active: !member.active });
  }

  async function remove() {
    if (!member) return;
    const ok = await confirm({
      title: "Delete staff member",
      message: `Delete "${member.name}"? This cannot be undone. Their sales history stays in reports.`,
      confirmText: "Delete",
      destructive: true
    });
    if (!ok) return;
    await deleteStaff(member.id);
    router.back();
  }

  if (loading) {
    return (
      <Screen maxWidth={720}>
        <Skeleton height={120} radius={12} />
        <Skeleton height={260} radius={12} />
      </Screen>
    );
  }

  if (!member) {
    return (
      <Screen maxWidth={720}>
        <PageHeader title="Staff member not found" />
        <Button onPress={() => router.back()} title="Go back" variant="ghost" />
      </Screen>
    );
  }

  const isCurrentUser = member.id === staffId;
  const pinLength = pin.trim().length;
  const hasChanges =
    name.trim() !== member.name ||
    selectedRole !== member.role ||
    pinLength === 4;
  const canSave =
    name.trim().length > 1 &&
    (pinLength === 0 || pinLength === 4) &&
    hasChanges;

  return (
    <Screen maxWidth={isCompact ? 720 : 820}>
      <PageHeader
        right={
          <Badge
            label={member.active ? "Active" : "Inactive"}
            tone={member.active ? "success" : "neutral"}
          />
        }
        subtitle={isCurrentUser ? "This is your login" : "Login and permissions"}
        title={member.name}
      />

      <Surface>
        <View style={styles.identity}>
          <Avatar name={member.name} size={56} />
          <View style={styles.identityText}>
            <AppText variant="title3">{member.name}</AppText>
            <AppText style={styles.capitalize} tone="secondary" variant="small">
              {member.role} · joined{" "}
              {new Date(member.createdAt).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric"
              })}
            </AppText>
          </View>
        </View>
      </Surface>

      <View style={styles.section}>
        <AppText variant="title3">Details</AppText>
        <Surface style={styles.form}>
          <Field label="Full name" onChangeText={setName} value={name} />
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
          </View>
          <Field
            hint="4 digits · leave blank to keep current"
            keyboardType="number-pad"
            label="PIN"
            maxLength={4}
            onChangeText={(value) => setPin(value.replace(/\D/g, ""))}
            secureTextEntry
            value={pin}
          />
          <Button
            disabled={!canSave}
            fullWidth
            haptic
            loading={saving}
            onPress={save}
            title="Save changes"
          />
        </Surface>
      </View>

      <View style={styles.section}>
        <AppText variant="title3">Access</AppText>
        <Surface style={styles.form}>
          <AppText tone="secondary" variant="small">
            {member.active
              ? "This login can open the till with its PIN."
              : "This login is blocked from signing in."}
          </AppText>
          <Button
            icon={member.active ? "pause-outline" : "play-outline"}
            onPress={toggleActive}
            title={member.active ? "Deactivate login" : "Activate login"}
            variant="ghost"
          />
          {canDelete ? (
            <Button
              disabled={isCurrentUser}
              icon="trash-outline"
              onPress={remove}
              title={isCurrentUser ? "You cannot delete your own login" : "Delete staff member"}
              variant="danger"
            />
          ) : null}
        </Surface>
      </View>
    </Screen>
  );
}

const staffDetailStyles = createStyles((theme) => ({
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.md
  },
  identityText: { flex: 1, gap: 2 },
  capitalize: { textTransform: "capitalize" },
  section: { gap: theme.space.xs },
  form: { gap: theme.space.md },
  fieldGap: { gap: theme.space.xs }
}));
const useStaffDetailStyles = () => staffDetailStyles();
