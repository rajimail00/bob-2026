import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  invalidateForNotification,
  useNotificationEvents,
} from "../hooks/useNotificationEvents";
import {
  notificationKeys,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../hooks/useNotifications";
import { getNotificationDestination } from "../types/notification.types";
import { notificationsApi } from "../api/notifications.api";

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
};
const mockGetSocket = jest.fn(() => mockSocket);
const mockDisconnectSocket = jest.fn();

jest.mock("@/lib/socket", () => ({
  getSocket: () => mockGetSocket(),
  disconnectSocket: () => mockDisconnectSocket(),
}));

jest.mock("../api/notifications.api", () => ({
  notificationsApi: {
    list: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  },
}));

const notification = {
  _id: "notification-1",
  recipientId: "user-1",
  type: "new_application",
  data: { jobId: "job-1", applicationId: "application-1", workerId: "worker-1" },
  readAt: null,
  createdAt: "2026-08-31T10:00:00.000Z",
  updatedAt: "2026-08-31T10:00:00.000Z",
};

const testClients = [];

function createClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  testClients.push(client);
  return client;
}

function wrapperFor(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function seedNotifications(client, items = [notification], unreadCount = 1) {
  client.setQueryData(notificationKeys.list, {
    pages: [{ items, total: items.length, page: 1, pageSize: 20, unreadCount }],
    pageParams: [1],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, isHydrated: true });
});

afterEach(() => {
  testClients.splice(0).forEach((client) => client.clear());
});

test("logged-out users do not connect", () => {
  const client = createClient();
  renderHook(() => useNotificationEvents(), { wrapper: wrapperFor(client) });
  expect(mockGetSocket).not.toHaveBeenCalled();
});

test("the global listener registers once, updates unread cache, and cleans up", () => {
  const client = createClient();
  seedNotifications(client, [], 0);
  useAuthStore.setState({ accessToken: "token", user: { id: "user-1" } });

  const rendered = renderHook(() => useNotificationEvents(), { wrapper: wrapperFor(client) });
  expect(mockSocket.on).toHaveBeenCalledTimes(1);
  expect(mockSocket.on).toHaveBeenCalledWith("notification:new", expect.any(Function));

  const handler = mockSocket.on.mock.calls[0][1];
  act(() => handler(notification));
  expect(client.getQueryData(notificationKeys.list).pages[0].unreadCount).toBe(1);
  expect(client.getQueryData(notificationKeys.list).pages[0].items[0]).toEqual(notification);

  rendered.rerender();
  expect(mockSocket.on).toHaveBeenCalledTimes(1);
  rendered.unmount();
  expect(mockSocket.off).toHaveBeenCalledWith("notification:new", handler);
  expect(mockDisconnectSocket).toHaveBeenCalledTimes(1);
});

test("incoming notification types invalidate their affected query groups", () => {
  const client = createClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");

  invalidateForNotification(client, notification);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jobs", "mine", "posted"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["applications", "forJob", "job-1"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["conversations", "forJob", "job-1"] });

  invalidate.mockClear();
  invalidateForNotification(client, { ...notification, type: "job_cancelled" });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jobs", "list"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["applications", "mine"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jobs", "mine", "assigned"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jobs", "detail", "job-1"] });

  client.setQueryData(["jobs", "list", { page: 1 }], {
    items: [{ _id: "job-1", status: "active" }],
    total: 1,
    page: 1,
    pageSize: 20,
  });
  invalidate.mockClear();
  invalidateForNotification(client, { ...notification, type: "offer_received" });
  expect(client.getQueryData(["jobs", "list", { page: 1 }]).items).toEqual([]);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jobs", "list"] });
});

test("mark-one and mark-all mutations update unread UI state", async () => {
  const client = createClient();
  seedNotifications(client);
  notificationsApi.markRead.mockResolvedValue({ ...notification, readAt: "2026-08-31T11:00:00.000Z" });

  const one = renderHook(() => useMarkNotificationRead(), { wrapper: wrapperFor(client) });
  await act(async () => one.result.current.mutateAsync(notification._id));
  expect(client.getQueryData(notificationKeys.list).pages[0].items[0].readAt).toBeTruthy();
  expect(client.getQueryData(notificationKeys.list).pages[0].unreadCount).toBe(0);

  seedNotifications(client);
  notificationsApi.markAllRead.mockResolvedValue({ modifiedCount: 1 });
  const all = renderHook(() => useMarkAllNotificationsRead(), { wrapper: wrapperFor(client) });
  await act(async () => all.result.current.mutateAsync());
  expect(client.getQueryData(notificationKeys.list).pages[0].unreadCount).toBe(0);
  expect(client.getQueryData(notificationKeys.list).pages[0].items[0].readAt).toBeTruthy();
  one.unmount();
  all.unmount();
});

test("notification destinations are type-safe for applicants, chat, jobs, and missing data", () => {
  expect(getNotificationDestination(notification)).toEqual({
    screen: "ApplicantProfile",
    params: { jobId: "job-1", applicationId: "application-1" },
  });
  expect(getNotificationDestination({ ...notification, type: "new_message" })).toEqual({
    screen: "Chat",
    params: { jobId: "job-1", workerId: "worker-1" },
  });
  expect(getNotificationDestination({ ...notification, type: "job_updated" })).toEqual({
    screen: "JobDetail",
    params: { jobId: "job-1" },
  });
  expect(getNotificationDestination({ ...notification, data: {} })).toBeNull();
});
