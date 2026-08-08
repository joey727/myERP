import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { listCustomersWithLastSale } from "@/db/database";
import type { CustomerSummary } from "@/db/types";
import { formatMoney } from "@/lib/money";
import { Card, EmptyState, Screen, Stat } from "@/ui/components";
import { colors, fontSize } from "@/ui/theme";

export default function CustomersScreen() {
  const isFocused = useIsFocused();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    if (isFocused) {
      listCustomersWithLastSale().then(setCustomers);
    }
  }, [isFocused]);

  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <Screen>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Stat label="Customers" value={String(customers.length)} />
          <Stat label="Lifetime value" tone="success" value={formatMoney(totalSpent, "GHS")} />
        </View>

        {customers.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No loyalty customers yet"
            subtitle="Customers are added automatically when you record a sale with a phone number."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {customers.map((customer) => (
              <Card key={customer.id}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: colors.ink, fontSize: fontSize.lg, fontWeight: "900" }}>
                      {customer.name ?? "Customer"}
                    </Text>
                    <Text style={{ color: colors.muted }}>{customer.phone}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ color: colors.ink, fontSize: fontSize.lg, fontWeight: "900" }}>
                      {formatMoney(customer.totalSpent, "GHS")}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
                      {customer.visitCount} visit{customer.visitCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                {customer.lastSaleAt && (
                  <Text style={{ color: colors.muted, fontSize: fontSize.sm, marginTop: 4 }}>
                    Last purchase {new Date(customer.lastSaleAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                    {" · "}
                    {formatMoney(customer.lastSaleTotal, "GHS")}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}
      </Screen>
    </ScrollView>
  );
}