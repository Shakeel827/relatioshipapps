export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Arrival: undefined;
  ChatList: undefined;
  Chat: { conversationId: string; title?: string };
  Invite: { code?: string } | undefined;
  Settings: undefined;
};

