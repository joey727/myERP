import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useSession, logout, getInactivityTimeout, setInactivityTimeout, INACTIVITY_MINUTES_OPTIONS } from "@/auth/session";
import { canAccess } from "@/auth/permissions";
import { getBusiness, updateBusiness } from "@/db/database";
import type { StaffRole } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { Card, Chip, Field, PrimaryButton, Screen, ScreenLoader, SecondaryButton } from "@/ui/components";
import { colors, fontSize } from "@/ui/theme";

const timeoutLabels: Record<number, string> = {
  0: "Never",
  15: "15 min",
  30: "30 min",
  60: "60 min",
  480: "8 hours",
};

export default function SettingsScreen() {
  const router = useRouter();
  const { staffRole } = useSession();
  const role = (staffRole ?? "cashier") as StaffRole;
  const canEdit = canAccess(role, "settings:edit");
  const canExport = canAccess(role, "data:export");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [currency, setCurrency] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [inactivityTimeout, setInactivityTimeoutState] = useState(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBusiness().then((b) => {
      if (b) {
        setName(b.name);
        setCategory(b.category);
        setCurrency(b.currency);
        setTaxRate(String(b.taxRate));
      }
    });
    getInactivityTimeout().then(setInactivityTimeoutState).finally(() => setLoading(false));
  }, []);

  const canSave = name.trim().length > 1;

  async function handleSave() {
    await updateBusiness({
      name: name.trim(),
      category: category.trim(),
      currency: currency.trim(),
      taxRate: parseMoney(taxRate)
    });
    router.back();
  }

  if (loading) {
    return <ScreenLoader message="Loading settings" />;
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <Card>
          <Text style={{ color: colors.ink, fontSize: fontSize.xl, fontWeight: "900", marginBottom: 4 }}>Business Details</Text>
          <Field label="Business name" onChangeText={setName} value={name} editable={canEdit} />
          <Field label="Category" onChangeText={setCategory} value={category} editable={canEdit} />
          <Field label="Currency" onChangeText={setCurrency} placeholder="GHS, USD, etc." value={currency} editable={canEdit} />
          <Field
            keyboardType="decimal-pad"
            label="Tax rate (%)"
            onChangeText={setTaxRate}
            placeholder="0"
            value={taxRate}
            editable={canEdit}
          />
        </Card>

        {canEdit && (
          <PrimaryButton disabled={!canSave} onPress={handleSave} title="Save settings" />
        )}
        <SecondaryButton onPress={() => router.back()} title="Cancel" />

        {canExport && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: colors.ink, fontSize: fontSize.lg, fontWeight: "900", marginBottom: 12 }}>Data</Text>
            <SecondaryButton onPress={() => router.push("/backup")} title="Backup & Export" />
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: colors.ink, fontSize: fontSize.lg, fontWeight: "900", marginBottom: 12 }}>Session</Text>
          {canEdit && (
            <>
              <Text style={{ color: colors.muted, fontSize: fontSize.base, fontWeight: "700", marginBottom: 8 }}>
                Auto-lock after
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {INACTIVITY_MINUTES_OPTIONS.map((minutes) => (
                  <Chip
                    key={minutes}
                    label={timeoutLabels[minutes]}
                    selected={inactivityTimeout === minutes}
                    onPress={() => {
                      setInactivityTimeout(minutes);
                      setInactivityTimeoutState(minutes);
                    }}
                  />
                ))}
              </View>
              <Text style={{ color: colors.muted, fontSize: fontSize.sm, marginBottom: 12 }}>
                Locks the app after this much inactivity in the background. Anyone logging in next needs a PIN.
              </Text>
            </>
          )}
          <SecondaryButton
            onPress={async () => {
              await logout();
              router.replace("/login");
            }}
            title="Log out"
          />
        </View>
      </Screen>
    </ScrollView>
  );
}
