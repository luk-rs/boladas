export type TeamMemberRow = {
  id: string;
  user_id: string;
  profiles?: { email: string | null; display_name: string | null } | null;
  roles: { role: string }[];
};

export type Invite = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  roles: string[];
};
