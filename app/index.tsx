import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { getBusiness, saveBusiness, subscribeBusinessChange } from "@/db/database";
import { Business } from "@/db/types";
import { Card, ChipGroup, Field, PrimaryButton, Screen } from "@/ui/components";
import { colors, fontSize } from "@/ui/theme";

const categories = ["Retail shop", "Provision store", "Pharmacy", "Food vendor", "Boutique", "Spare parts"] as const;

export default function WelcomeScreen() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPin, setOwnerPin] = useState("");

  useEffect(() => {
    getBusiness().then(setBusiness);
    return subscribeBusinessChange(() => {
      getBusiness().then(setBusiness);
    });
  }, []);

  if (business) {
    return <Redirect href="/(tabs)" />;
  }

  const canContinue = name.trim().length > 1 && ownerName.trim().length > 1 && ownerPin.trim().length >= 4;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Screen>
          <View style={{ gap: 8, paddingTop: 36 }}>
            <Text style={{ color: colors.ink, fontSize: fontSize["4xl"], fontWeight: "900", letterSpacing: 0 }}>myERP</Text>
            <Text style={{ color: colors.muted, fontSize: fontSize.lg, lineHeight: 23 }}>
              A local-first sales, inventory, staff, payment, and receipt app for small businesses.
            </Text>
          </View>

          <Card>
            <Field label="Business name" onChangeText={setName} placeholder="Akosua Mini Mart" value={name} />
            <Text style={{ color: colors.ink, fontSize: fontSize.base, fontWeight: "700" }}>Business category</Text>
            <ChipGroup
              items={categories}
              selected={category}
              onSelect={setCategory}
            />
            <Field label="Owner name" onChangeText={setOwnerName} placeholder="Owner or manager" value={ownerName} />
            <Field
              keyboardType="number-pad"
              label="Owner PIN"
              onChangeText={setOwnerPin}
              placeholder="At least 4 digits"
              secureTextEntry
              value={ownerPin}
            />
            <PrimaryButton
              disabled={!canContinue}
              onPress={async () => {
                await saveBusiness({
                  name: name.trim(),
                  category,
                  currency: "GHS",
                  taxRate: 0,
                  ownerName: ownerName.trim(),
                  ownerPin: ownerPin.trim()
                });
              }}
              title="Create business"
            />
          </Card>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
