import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import {
  getInactivityTimeout,
  INACTIVITY_MINUTES_OPTIONS,
  logout,
  setInactivityTimeout,
  useSession
} from "@/auth/session";
import { canAccess } from "@/auth/permissions";
import { useBusiness } from "@/business";
import { updateBusiness } from "@/db/database";
import type { StaffRole } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { notify } from "@/ui/dialog";
import {
  createStyles,
  useResponsive,
  useThemePreference,
  type ThemePreference
} from "@/ui/design";
import {
  AppText,
  Button,
  Chip,
  Field,
  Screen,
  Segmented,
  Surface
} from "@/ui/primitives";

const timeoutLabels: Record<number, string> = {
  0: "Never",
  15: "15 min",
  30: "30 min",
  60: "1 hour",
  480: "8 hours"
};

export default function SettingsScreen() {
  const styles = useSettingsStyles();
  const { isCompact } = useResponsive();
  const { staffRole } = useSession();
  const { business, refresh } = useBusiness();
  const { preference, setPreference } = useThemePreference();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canEdit = canAccess(role, "settings:edit");
  const canExport = canAccess(role, "data:export");

  const [name, setName] = useState(business?.name ?? "");
  const [category, setCategory] = useState(business?.category ?? "");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [email, setEmail] = useState(business?.email ?? "");
  const [address, setAddress] = useState(business?.address ?? "");
  const [taxId, setTaxId] = useState(business?.taxId ?? "");
  const [receiptFooter, setReceiptFooter] = useState(business?.receiptFooter ?? "");
  const [currency, setCurrency] = useState(business?.currency ?? "GHS");
  const [taxRate, setTaxRate] = useState(String(business?.taxRate ?? 0));
  const [inactivity, setInactivity] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setCategory(business.category);
    setPhone(business.phone ?? "");
    setEmail(business.email ?? "");
    setAddress(business.address ?? "");
    setTaxId(business.taxId ?? "");
    setReceiptFooter(business.receiptFooter ?? "");
    setCurrency(business.currency);
    setTaxRate(String(business.taxRate));
  }, [business]);

  useEffect(() => {
    getInactivityTimeout().then(setInactivity).catch(() => {});
  }, []);

  async function saveBusiness() {
    if (name.trim().length < 2) return;
    setSaving(true);
    try {
      await updateBusiness({
        name: name.trim(),
        category: category.trim() || "General",
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        taxId: taxId.trim(),
        receiptFooter: receiptFooter.trim(),
        currency: currency.trim().toUpperCase() || "GHS",
        taxRate: parseMoney(taxRate)
      });
      refresh();
      notify({ title: "Settings saved", tone: "success" });
    } catch (error) {
      notify({
        title: "Could not save settings",
        message: error instanceof Error ? error.message : String(error),
        tone: "danger"
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen maxWidth={isCompact ? 720 : 820}>
      <AppText tone="secondary" variant="small">
        {canEdit
          ? "Changes apply to the till immediately."
          : "Read-only for your role."}
      </AppText>

      <View style={styles.section}>
        <AppText variant="title3">Business</AppText>
        <Surface style={styles.form}>
          <Field
            editable={canEdit}
            label="Business name"
            onChangeText={setName}
            value={name}
          />
          <Field
            editable={canEdit}
            label="Category"
            onChangeText={setCategory}
            placeholder="Provision store"
            value={category}
          />
          <AppText tone="muted" variant="caption">
            These details appear on printed receipts.
          </AppText>
          <Field
            editable={canEdit}
            hint="Optional"
            keyboardType="phone-pad"
            label="Business phone"
            onChangeText={setPhone}
            placeholder="024 123 4567"
            value={phone}
          />
          <Field
            autoCapitalize="none"
            editable={canEdit}
            hint="Optional"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="hello@business.com"
            value={email}
          />
          <Field
            editable={canEdit}
            hint="Optional"
            label="Address"
            onChangeText={setAddress}
            placeholder="12 Market Road, Accra"
            value={address}
          />
          <Field
            editable={canEdit}
            hint="Optional"
            label="Tax ID"
            onChangeText={setTaxId}
            placeholder="TIN or business registration"
            value={taxId}
          />
          <Field
            editable={canEdit}
            hint="Optional"
            label="Receipt footer"
            onChangeText={setReceiptFooter}
            placeholder="Thank you for shopping with us."
            value={receiptFooter}
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                autoCapitalize="characters"
                editable={canEdit}
                label="Currency"
                maxLength={3}
                onChangeText={(value) => setCurrency(value.replace(/[^a-zA-Z]/g, ""))}
                value={currency}
              />
            </View>
            <View style={styles.half}>
              <Field
                editable={canEdit}
                hint="Percent"
                keyboardType="decimal-pad"
                label="Tax rate"
                onChangeText={setTaxRate}
                value={taxRate}
              />
            </View>
          </View>
          {canEdit ? (
            <Button
              disabled={name.trim().length < 2}
              fullWidth
              loading={saving}
              onPress={saveBusiness}
              title="Save business details"
            />
          ) : null}
        </Surface>
      </View>

      <View style={styles.section}>
        <AppText variant="title3">Appearance</AppText>
        <Surface style={styles.form}>
          <Segmented
            onChange={(value) => setPreference(value as ThemePreference)}
            options={[
              { label: "System", value: "system" },
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" }
            ]}
            value={preference}
          />
          <AppText tone="secondary" variant="small">
            System follows your phone or computer. You can override it here any time.
          </AppText>
        </Surface>
      </View>

      <View style={styles.section}>
        <AppText variant="title3">Session</AppText>
        <Surface style={styles.form}>
          {canEdit ? (
            <>
              <AppText tone="secondary" variant="label">
                Auto-lock after inactivity
              </AppText>
              <View style={styles.chips}>
                {INACTIVITY_MINUTES_OPTIONS.map((minutes) => (
                  <Chip
                    key={minutes}
                    label={timeoutLabels[minutes]}
                    onPress={() => {
                      setInactivity(minutes);
                      void setInactivityTimeout(minutes);
                    }}
                    selected={inactivity === minutes}
                  />
                ))}
              </View>
              <AppText tone="muted" variant="caption">
                When the app has been in the background for this long, the next
                person must enter a PIN.
              </AppText>
            </>
          ) : null}
          <Button
            fullWidth
            icon="log-out-outline"
            onPress={async () => {
              await logout();
              router.replace("/login");
            }}
            title="Log out"
            variant="ghost"
          />
        </Surface>
      </View>

      {canExport ? (
        <View style={styles.section}>
          <AppText variant="title3">Data</AppText>
          <Surface padded={false}>
            <View style={styles.linkRow}>
              <View style={styles.linkText}>
                <AppText variant="bodyStrong">Backup and export</AppText>
                <AppText tone="secondary" variant="small">
                  Download every product, sale, customer and staff record as CSV.
                </AppText>
              </View>
              <Button
                onPress={() => router.push("/backup")}
                size="sm"
                title="Open"
                variant="secondary"
              />
            </View>
          </Surface>
        </View>
      ) : null}

      <AppText center tone="muted" variant="caption">
        myERP · local-first · no account required
      </AppText>
    </Screen>
  );
}

const settingsStyles = createStyles((theme) => ({
  section: { gap: theme.space.xs },
  form: { gap: theme.space.md },
  row: { flexDirection: "row", gap: theme.space.sm },
  half: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.xs },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.space.md,
    padding: theme.space.md
  },
  linkText: { flex: 1, gap: 2 }
}));
const useSettingsStyles = () => settingsStyles();
