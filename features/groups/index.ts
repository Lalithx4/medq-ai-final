// Groups Feature - Main Export
export * from './types';
export * from './hooks';

// Explicitly export components to avoid naming conflicts
export { 
  CreateGroupModal,
  JoinGroupModal,
  GroupCard,
  GroupList,
  GroupMessage as GroupMessageComponent,
  MessageInput,
  GroupChat,
  MembersList,
  AddMembersModal,
  GroupHeader,
  GroupInfo,
  StreamShareCard,
  InviteLinkModal,
  ShareToGroupModal
} from './components';
