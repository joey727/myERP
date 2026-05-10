import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { getBusiness, updateBusiness } from "@/db/database";
import type { Business } from "@/db/types";
import { parseMoney } from "@/lib/money";
import { Field, PrimaryButton, Screen, SecondaryButton } from "@/ui/components";
import { colors } from "@/ui/theme";
import { Text } from "react-native";

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
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.muted }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
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

        <PrimaryButton disabled={!canSave} onPress={handleSave} title="Save settings" />
        <SecondaryButton onPress={() => router.back()} title="Cancel" />

        <View style={{ marginTop: 24 }}>
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "900", marginBottom: 12 }}>Data</Text>
          <SecondaryButton onPress={() => router.push("/backup")} title="Backup & Export" />
        </View>
      </Screen>
    </ScrollView>
  );
}