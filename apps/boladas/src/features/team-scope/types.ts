export type TeamMembership = {
  teamMemberId: string;
  teamId: string;
  teamName: string;
  roles: string[];
};

export type InviteInfo = {
  team_name: string;
  team_id: string;
};

export type TeamRosterStatus = {
  id: string;
  name: string;
  memberCount: number;
  members: Array<{
    id: string;
    label?: string;
    isSelf?: boolean;
  }>;
};
