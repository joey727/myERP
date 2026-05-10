import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";

import { getBusiness, saveBusiness } from "@/db/database";
import { Business } from "@/db/types";
import { Card, Field, PrimaryButton, Screen } from "@/ui/components";
import { colors } from "@/ui/theme";

const categories = ["Retail shop", "Provision store", "Pharmacy", "Food vendor", "Boutique", "Spare parts"];

export default function WelcomeScreen() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPin, setOwnerPin] = useState("");

  useEffect(() => {
    getBusiness().then(setBusiness);
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
            <Text style={{ color: colors.ink, fontSize: 34, fontWeight: "900", letterSpacing: 0 }}>myERP</Text>
            <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
              A local-first sales, inventory, staff, payment, and receipt app for small businesses.
            </Text>
          </View>

          <Card>
            <Field label="Business name" onChangeText={setName} placeholder="Akosua Mini Mart" value={name} />
            <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "700" }}>Business category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {categories.map((item) => (
                <Text
                  key={item}
                  onPress={() => setCategory(item)}
                  style={{
                    backgroundColor: category === item ? colors.primary : "#ffffff",
                    borderColor: category === item ? colors.primary : colors.border,
                    borderRadius: 8,
                    borderWidth: 1,
                    color: category === item ? "#ffffff" : colors.ink,
                    fontWeight: "800",
                    paddingHorizontal: 10,
                    paddingVertical: 8
                  }}
                >
                  {item}
                </Text>
              ))}
            </View>
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
                router.replace("/(tabs)");
              }}
              title="Create business"
            />
          </Card>
        </Screen>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
