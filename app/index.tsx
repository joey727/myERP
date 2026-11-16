import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { loginStaffById } from "@/auth/session";
import { getBusiness, saveBusiness, subscribeBusinessChange } from "@/db/database";
import type { Business } from "@/db/types";
import { notify } from "@/ui/dialog";
import { createStyles, useResponsive, useTheme } from "@/ui/design";
import {
  AppText,
  Button,
  Chip,
  Field,
  Screen,
  Skeleton,
  Surface
} from "@/ui/primitives";

const categories = [
  "Retail shop",
  "Provision store",
  "Pharmacy",
  "Food vendor",
  "Boutique",
  "Spare parts"
] as const;

const steps = ["Business", "Contact", "Owner", "Review"] as const;

export default function WelcomeScreen() {
  const styles = useSetupStyles();
  const theme = useTheme();
  const { isCompact } = useResponsive();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getBusiness()
      .then(setBusiness)
      .catch((error) => console.error("getBusiness failed:", error));
    return subscribeBusinessChange(() => {
      getBusiness()
        .then(setBusiness)
        .catch((error) => console.error("getBusiness failed:", error));
    });
  }, []);

  if (business === undefined) {
    return (
      <Screen maxWidth={560} safeTop>
        <Skeleton height={40} width="60%" />
        <Skeleton height={24} width="85%" />
        <Skeleton height={280} radius={12} />
      </Screen>
    );
  }

  if (business) {
    return <Redirect href="/(tabs)" />;
  }

  const stepValid =
    step === 0
      ? name.trim().length > 1
      : step === 2
        ? ownerName.trim().length > 1 && ownerPin.trim().length === 4
        : true;

  async function create() {
    setCreating(true);
    try {
      const ownerStaffId = await saveBusiness({
        address: address.trim(),
        category,
        currency: "GHS",
        email: email.trim(),
        name: name.trim(),
        ownerName: ownerName.trim(),
        ownerPin: ownerPin.trim(),
        phone: phone.trim(),
        receiptFooter: receiptFooter.trim(),
        taxId: taxId.trim(),
        taxRate: 0
      });
      await loginStaffById(ownerStaffId);
      router.replace("/(tabs)");
    } catch (error) {
      console.error("saveBusiness failed:", error);
      notify({
        message: error instanceof Error ? error.message : String(error),
        title: "Could not create business",
        tone: "danger"
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Screen
      keyboard
      maxWidth={isCompact ? 560 : 960}
      safeTop
      contentStyle={styles.content}
    >
      <View style={styles.top}>
        <AppText variant="title1">Set up myERP</AppText>
        <AppText tone="secondary" variant="small">
          A local-first till for sales, stock, staff and receipts. No internet
          needed once you start.
        </AppText>
      </View>

      <View style={styles.progress}>
        {steps.map((label, index) => (
          <View key={label} style={styles.progressItem}>
            <View
              style={[
                styles.progressBar,
                index <= step && styles.progressBarActive
              ]}
            />
            <AppText
              tone={index === step ? "default" : "muted"}
              variant="caption"
            >
              {label}
            </AppText>
          </View>
        ))}
      </View>

      <Surface style={styles.panel}>
        {step === 0 ? (
          <>
            <AppText variant="title3">What is your business called?</AppText>
            <Field
              autoFocus
              label="Business name"
              onChangeText={setName}
              placeholder="e.g. Akosua Mini Mart"
              returnKeyType="next"
              value={name}
            />
            <View style={styles.fieldGap}>
              <AppText tone="secondary" variant="label">
                What do you sell?
              </AppText>
              <View style={styles.chips}>
                {categories.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    onPress={() => setCategory(option)}
                    selected={category === option}
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <AppText variant="title3">What should appear on receipts?</AppText>
            <AppText tone="secondary" variant="small">
              These are optional, but they make a receipt look complete and help
              customers reach you.
            </AppText>
            <Field
              autoFocus
              hint="Optional"
              keyboardType="phone-pad"
              label="Business phone"
              onChangeText={setPhone}
              placeholder="024 123 4567"
              value={phone}
            />
            <Field
              autoCapitalize="none"
              hint="Optional"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="hello@business.com"
              value={email}
            />
            <Field
              hint="Optional"
              label="Address"
              onChangeText={setAddress}
              placeholder="12 Market Road, Accra"
              value={address}
            />
            <Field
              hint="Optional"
              label="Tax ID"
              onChangeText={setTaxId}
              placeholder="TIN or business registration"
              value={taxId}
            />
            <Field
              hint="Optional"
              label="Receipt footer"
              onChangeText={setReceiptFooter}
              placeholder="Thank you for shopping with us."
              value={receiptFooter}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <AppText variant="title3">Who runs the till?</AppText>
            <AppText tone="secondary" variant="small">
              This is the owner account. You can add managers and cashiers later.
            </AppText>
            <Field
              autoFocus
              label="Owner name"
              onChangeText={setOwnerName}
              placeholder="e.g. Akosua Mensah"
              returnKeyType="next"
              value={ownerName}
            />
            <Field
              hint="4 digits"
              keyboardType="number-pad"
              label="Owner PIN"
              maxLength={4}
              onChangeText={(value) => setOwnerPin(value.replace(/\D/g, ""))}
              placeholder="••••"
              secureTextEntry
              value={ownerPin}
            />
            <View style={styles.note}>
              <Ionicons color={theme.colors.primary} name="lock-closed-outline" size={16} />
              <AppText style={styles.noteText} tone="secondary" variant="small">
                The PIN keeps the till and business details private on a shared
                phone.
              </AppText>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <AppText variant="title3">Ready to open the till</AppText>
            <View style={styles.summary}>
              <SummaryRow label="Business" value={name.trim()} />
              <SummaryRow label="Type" value={category} />
              {phone.trim() ? <SummaryRow label="Phone" value={phone.trim()} /> : null}
              {email.trim() ? <SummaryRow label="Email" value={email.trim()} /> : null}
              {address.trim() ? <SummaryRow label="Address" value={address.trim()} /> : null}
              {taxId.trim() ? <SummaryRow label="Tax ID" value={taxId.trim()} /> : null}
              {receiptFooter.trim() ? (
                <SummaryRow label="Footer" value={receiptFooter.trim()} />
              ) : null}
              <SummaryRow label="Owner" value={ownerName.trim()} />
              <SummaryRow label="Currency" value="Ghana Cedi (GHS)" />
              <SummaryRow label="PIN" value="4 digits set" />
            </View>
            <AppText tone="secondary" variant="small">
              You can change these receipt details, the currency and tax rate in
              Settings at any time.
            </AppText>
          </>
        ) : null}
      </Surface>

      <View style={styles.footer}>
        {step > 0 ? (
          <View style={styles.footerBack}>
            <Button
              fullWidth
              icon="arrow-back"
              onPress={() => setStep((current) => current - 1)}
              title="Back"
              variant="ghost"
            />
          </View>
        ) : null}
        <View style={styles.footerNext}>
          <Button
            disabled={!stepValid}
            fullWidth
            haptic
            icon={step === 3 ? "checkmark" : "arrow-forward"}
            loading={creating}
            onPress={() => {
              if (step < 3) {
                setStep((current) => current + 1);
                return;
              }
              void create();
            }}
            title={step === 3 ? "Create business" : "Continue"}
          />
        </View>
      </View>
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const styles = useSetupStyles();
  return (
    <View style={styles.summaryRow}>
      <AppText tone="secondary" variant="small">
        {label}
      </AppText>
      <AppText style={styles.summaryValue} variant="smallStrong">
        {value}
      </AppText>
    </View>
  );
}

const setupStyles = createStyles((theme) => ({
  content: { justifyContent: "center", minHeight: "100%" },
  top: { gap: theme.space.xs },
  progress: { flexDirection: "row", gap: theme.space.xs },
  progressItem: { flex: 1, gap: 6 },
  progressBar: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.full,
    height: 4
  },
  progressBarActive: { backgroundColor: theme.colors.primary },
  panel: { gap: theme.space.md },
  fieldGap: { gap: theme.space.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.space.xs },
  note: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: theme.space.xs,
    padding: theme.space.sm
  },
  noteText: { flex: 1 },
  summary: { gap: theme.space.sm },
  summaryRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.space.md,
    justifyContent: "space-between",
    paddingBottom: theme.space.xs
  },
  summaryValue: { flex: 1, textAlign: "right" },
  footer: {
    flexDirection: "row",
    gap: theme.space.xs,
    marginTop: theme.space.xs
  },
  footerBack: { flex: 1 },
  footerNext: { flex: 1.4 }
}));
const useSetupStyles = () => setupStyles();
