import React from "react";
import { render, screen } from "@testing-library/react-native";
import { NotificationsScreen } from "../screens/NotificationsScreen";

const mockUseNotifications = jest.fn();

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("../hooks/useNotifications", () => ({
  useNotifications: () => mockUseNotifications(),
  useMarkNotificationRead: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en" },
  }),
}));

jest.mock("tamagui", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Stack = ({ children, ...props }) => React.createElement(View, props, children);
  return { XStack: Stack, YStack: Stack };
});

jest.mock("@/components/ui/Screen", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Screen: ({ children }) => React.createElement(View, null, children) };
});

jest.mock("@/components/ui/Text", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Text: ({ children, ...props }) => React.createElement(Text, props, children) };
});

jest.mock("@/components/ui/Button", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Button: ({ children }) => React.createElement(Text, null, children) };
});

jest.mock("@/components/ui/states/LoadingState", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { LoadingState: () => React.createElement(Text, { testID: "loading-state" }, "loading") };
});

jest.mock("@/components/ui/states/ErrorState", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { ErrorState: () => React.createElement(Text, { testID: "error-state" }, "error") };
});

jest.mock("@/components/ui/states/EmptyState", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { EmptyState: () => React.createElement(Text, { testID: "empty-state" }, "empty") };
});

jest.mock("../components/NotificationRow", () => ({ NotificationRow: () => null }));
jest.mock("@/lib/apiClient", () => ({ getApiErrorMessage: (_error, fallback) => fallback }));

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const baseQuery = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  isRefetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
};

test.each([
  ["loading", { ...baseQuery, isLoading: true }, "loading-state"],
  ["error", { ...baseQuery, isError: true, error: new Error("offline") }, "error-state"],
  ["empty", { ...baseQuery, data: { pages: [{ items: [], unreadCount: 0 }], pageParams: [1] } }, "empty-state"],
])("renders the %s state", (_name, query, testId) => {
  mockUseNotifications.mockReturnValue(query);
  render(<NotificationsScreen navigation={navigation} route={{ key: "notifications", name: "Notifications" }} />);
  expect(screen.getByTestId(testId)).toBeTruthy();
});
