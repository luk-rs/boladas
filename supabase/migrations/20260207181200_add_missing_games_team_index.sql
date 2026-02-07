-- Add missing index on games.team_id to improve query performance
-- This index is critical for joins between games and teams tables

CREATE INDEX IF NOT EXISTS idx_games_team_id ON public.games(team_id);

-- Add comment for documentation
COMMENT ON INDEX idx_games_team_id IS 
  'Performance index for games.team_id foreign key - critical for team-related queries';
