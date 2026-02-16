export type { TeamMembership, TeamRosterStatus } from "../team-scope/types";

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
  season_start?: string;
  holiday_start?: string;
};
