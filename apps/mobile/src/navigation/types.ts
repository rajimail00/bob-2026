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
  ApplicantProfile: {
    jobId: string;
    applicationId: string;
  };
  Chat: { jobId: string; workerId: string };
  WorkerProfileSetup: undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  Post: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  CreateProfile: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
