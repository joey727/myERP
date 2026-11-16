import { useEffect, useState } from "react";
import { View } from "react-native";

import { subscribeToConfirm, type ConfirmRequest } from "./dialog";
import { AppText, Button, Sheet } from "./primitives";

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => subscribeToConfirm(setRequest), []);

  function respond(value: boolean) {
    request?.resolve(value);
    setRequest(null);
  }

  return (
    <Sheet
      onClose={() => respond(false)}
      title={request?.title}
      visible={request !== null}
      footer={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              onPress={() => respond(false)}
              title={request?.cancelText ?? "Cancel"}
              variant="ghost"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              onPress={() => respond(true)}
              title={request?.confirmText ?? "Confirm"}
              variant={request?.destructive ? "danger" : "primary"}
            />
          </View>
        </View>
      }
    >
      <AppText tone="secondary">{request?.message}</AppText>
    </Sheet>
  );
}
