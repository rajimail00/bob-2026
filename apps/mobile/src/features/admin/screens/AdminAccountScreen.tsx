import { YStack } from "tamagui";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/features/auth/store/authStore";
import { AdminHeader } from "../components/AdminHeader";
import { useTranslation } from "react-i18next";
export function AdminAccountScreen() { const { t } = useTranslation(); const user = useAuthStore((s) => s.user); const logout = useLogout(); const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Admin"; return <Screen padded={false}><AdminHeader title={t("admin.account.title")} showBack /><YStack padding="$4"><Card elevated alignItems="center" gap="$3"><Avatar uri={user?.photoUrl} name={name} size={90} /><Text variant="h3">{name}</Text><Text muted>{user?.email}</Text><Button fullWidth loading={logout.isPending} onPress={() => logout.mutate()}>{t("common.logout")}</Button></Card></YStack></Screen>; }
