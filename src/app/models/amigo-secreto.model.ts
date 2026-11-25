export interface WishlistItem {
  id: string;
  participant_id: string;
  description: string;
}

export interface Participant {
  id: string;
  name: string;
  has_pin: boolean;
  wishlist: WishlistItem[];
}

export interface GroupView {
  id: string;
  title: string;
  suggested_price: string;
  invite_code: string;
  is_drawn: boolean;
  created_at: string;
  is_admin: boolean;
  admin_token?: string;
  participants: Participant[];
}

export interface RevealResult {
  participant_id: string;
  participant_name: string;
  target_name: string;
  suggested_price: string;
  group_title: string;
  target_wishlist: WishlistItem[];
}

export interface SavedParticipantMemory {
  participantId: string;
  participantName: string;
  inviteCode: string;
  groupTitle: string;
  updatedAt: string;
}

export interface SavedAdminGroupMemory {
  groupId: string;
  title: string;
  suggestedPrice: string;
  inviteCode: string;
  adminToken: string;
  createdAt: string;
}
