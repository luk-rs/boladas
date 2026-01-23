export type TeamMembership = {
  teamMemberId: string;
  teamId: string;
  teamName: string;
  roles: string[];
};

export type TeamRequest = {
  id: string;
  name: string;
  status: string;
  requested_by: string;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
};
