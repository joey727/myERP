import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { getBusiness, updateBusiness } from "@/db/database";
import type { Business } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { Card, Field, PrimaryButton, Screen, ScreenLoader, SecondaryButton } from "@/ui/components";
import { colors, fontSize } from "@/ui/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [currency, setCurrency] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBusiness().then((b) => {
      if (b) {
        setBusiness(b);
        setName(b.name);
        setCategory(b.category);
        setCurrency(b.currency);
        setTaxRate(String(b.taxRate));
      }
      setLoading(false);
    });
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
          <Field label="Business name" onChangeText={setName} value={name} />
          <Field label="Category" onChangeText={setCategory} value={category} />
          <Field label="Currency" onChangeText={setCurrency} placeholder="GHS, USD, etc." value={currency} />
          <Field
            keyboardType="decimal-pad"
            label="Tax rate (%)"
            onChangeText={setTaxRate}
            placeholder="0"
            value={taxRate}
          />
        </Card>

        <PrimaryButton disabled={!canSave} onPress={handleSave} title="Save settings" />
        <SecondaryButton onPress={() => router.back()} title="Cancel" />

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: colors.ink, fontSize: fontSize.lg, fontWeight: "900", marginBottom: 12 }}>Data</Text>
          <SecondaryButton onPress={() => router.push("/backup")} title="Backup & Export" />
        </View>
      </Screen>
    </ScrollView>
  );
}