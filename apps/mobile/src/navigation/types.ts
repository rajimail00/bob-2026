import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
};

export type HomeStackParamList = {
  HomeList: undefined;
  Notifications: undefined;
  JobDetail: { jobId: string };
  ApplicantProfile: {
    jobId: string;
    applicationId: string;
  };
  Chat: { jobId: string; workerId: string };
  WorkerProfileSetup: undefined;
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  JobDetail: { jobId: string };
  EditJob: { jobId: string };
  RepostJob: { jobId: string };
  ApplicantProfile: {
    jobId: string;
    applicationId: string;
  };
  Chat: { jobId: string; workerId: string };
  WorkerProfileSetup: undefined;
};

export type ProfileStackParamList = {
  ProfileOverview: undefined;
  ProfileSettings: undefined;
  ProfileCategories: undefined;
  ProfileEdit: undefined;
  ProfileNotifications: undefined;
  ProfileAccount: undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  Post: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminJobs: undefined;
  AdminTickets: undefined;
  AdminSettings: undefined;
};

export type AdminStackParamList = {
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
  AdminUserDetail: { userId: string };
  AdminUserJobs: { userId: string };
  AdminJobDetail: { jobId: string };
  AdminTicketDetail: { ticketId: string };
  AdminCategories: undefined;
  AdminFaqs: undefined;
  AdminAdvertisements: undefined;
  AdminAdvertisementForm: { advertisementId?: string } | undefined;
  AdminConfiguration: undefined;
  AdminNotifications: undefined;
  AdminAccount: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  CreateProfile: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
