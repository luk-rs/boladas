-- Add indexes for frequently queried columns to improve performance

-- Team members queries by user_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);

-- Team requests queries by user and status
CREATE INDEX IF NOT EXISTS idx_team_requests_requested_by ON team_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_team_requests_status ON team_requests(status);

-- Composite index for common admin query (pending requests)
CREATE INDEX IF NOT EXISTS idx_team_requests_status_requested_by ON team_requests(status, requested_by);

-- Profile lookups for system admins (used in auth checks)
CREATE INDEX IF NOT EXISTS idx_profiles_id_system_admin ON profiles(id, is_system_admin);

-- Team member roles lookup (used in team membership queries)
CREATE INDEX IF NOT EXISTS idx_team_member_roles_member_id ON team_member_roles(team_member_id);

-- Invite tokens lookup
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_team_id ON invites(team_id);
