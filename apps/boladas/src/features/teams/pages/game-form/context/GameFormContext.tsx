import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../../../lib/supabase";
import { useAuth } from "../../../../auth/useAuth";

export type Player = {
  id: string;
  name: string;
};

type TeamsResponse = {
  convocationId: string;
  teamName: string;
  scheduledAt: string;
  teams: {
    shirts: Player[];
    coletes: Player[];
  };
};

type ConvocationStatus = "open" | "accepted" | "dismissed";

type LineupPlayer = {
  id: string;
  name: string;
  slot: number;
  isGuest: boolean;
};

type TeamPlayersState = {
  shirts: Player[];
  coletes: Player[];
};

type DragState = {
  team: "shirts" | "coletes";
  index: number;
} | null;

type GameFormContextValue = {
  convocationId: string | undefined;
  sessionUserId: string | null;
  teamName: string;
  dateLabel: string;
  timeValue: string;
  setTimeValue: (value: string) => void;
  showTimePicker: boolean;
  setShowTimePicker: (value: boolean) => void;
  teamPlayers: TeamPlayersState;
  setTeamPlayers: Dispatch<SetStateAction<TeamPlayersState>>;
  dragging: DragState;
  setDragging: (value: DragState) => void;
  dragOver: DragState;
  setDragOver: (value: DragState) => void;
  actionState: "idle" | "accepting" | "rejecting";
  actionMessage: string | null;
  loading: boolean;
  error: string | null;
  statRows: Array<{
    id: string;
    icon: string;
    label: string;
    left: string | number;
    right: string | number;
    suffix: string;
  }>;
  addGuest: (team: "shirts" | "coletes") => void;
  handleRejectGame: () => Promise<void>;
  handleAcceptGame: () => Promise<void>;
};

const formatDate = (value?: string | null) => {
  if (!value) return "--/--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--";
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return "19:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "19:00";
  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const GameFormContext = createContext<GameFormContextValue | undefined>(
  undefined,
);

export function GameFormProvider({ children }: { children: ReactNode }) {
  const { convocationId } = useParams();
  const navigate = useNavigate();
  const { sessionUserId } = useAuth();
  const [teamName, setTeamName] = useState("Equipa");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [timeValue, setTimeValue] = useState("19:00");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayersState>({
    shirts: [],
    coletes: [],
  });
  const [guestCountShirts, setGuestCountShirts] = useState(0);
  const [guestCountColetes, setGuestCountColetes] = useState(0);
  const [dragging, setDragging] = useState<DragState>(null);
  const [dragOver, setDragOver] = useState<DragState>(null);
  const [actionState, setActionState] = useState<
    "idle" | "accepting" | "rejecting"
  >("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = useMemo(() => formatDate(scheduledAt), [scheduledAt]);
  const teamStats = useMemo(() => {
    const rng = () => Math.random();
    const makeStats = () => ({
      points: Math.floor(10 + rng() * 15),
      winPct: Math.floor(40 + rng() * 40),
      xg: (0.8 + rng() * 2.2).toFixed(2),
      xga: (0.8 + rng() * 2.2).toFixed(2),
    });
    return {
      shirts: makeStats(),
      coletes: makeStats(),
    };
  }, []);

  const statRows = useMemo(
    () => [
      {
        id: "points",
        icon: "🏆",
        label: "Total points",
        left: teamStats.shirts.points,
        right: teamStats.coletes.points,
        suffix: "",
      },
      {
        id: "win",
        icon: "📈",
        label: "Avg win %",
        left: teamStats.shirts.winPct,
        right: teamStats.coletes.winPct,
        suffix: "%",
      },
      {
        id: "xg",
        icon: "⚽️",
        label: "xGoals scored",
        left: teamStats.shirts.xg,
        right: teamStats.coletes.xg,
        suffix: "",
      },
      {
        id: "xga",
        icon: "🥅",
        label: "xGoals conceded",
        left: teamStats.shirts.xga,
        right: teamStats.coletes.xga,
        suffix: "",
      },
    ],
    [teamStats],
  );

  const buildScheduledAt = () => {
    if (!scheduledAt) return null;
    const nextDate = new Date(scheduledAt);
    const [hours, minutes] = timeValue.split(":").map(Number);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      nextDate.setHours(hours, minutes, 0, 0);
    }
    return nextDate.toISOString();
  };

  const buildLineupPayload = (players: Player[]): LineupPlayer[] =>
    players.map((player, index) => ({
      id: player.id,
      name: player.name,
      slot: index + 1,
      isGuest: player.id.startsWith("guest-"),
    }));

  const loadConvocationStatus = async (): Promise<ConvocationStatus | null> => {
    if (!convocationId || !supabase) return null;

    const { data, error: statusError } = await supabase
      .from("convocations")
      .select("status")
      .eq("id", convocationId)
      .single();

    if (statusError) {
      setActionMessage(statusError.message);
      return null;
    }

    return (data?.status ?? "open") as ConvocationStatus;
  };

  const handleRejectGame = useCallback(async () => {
    if (!convocationId || !supabase) return;
    setActionState("rejecting");
    setActionMessage(null);
    try {
      const { error: cancelError } = await supabase.rpc(
        "cancel_game_from_convocation",
        {
          p_convocation_id: convocationId,
        },
      );

      if (!cancelError) {
        setActionMessage("Convocatória rejeitada.");
        navigate("/profile", { replace: true });
        return;
      }

      const isMissingCancelRpc =
        cancelError.message
          ?.toLowerCase()
          .includes("cancel_game_from_convocation") ?? false;
      if (!isMissingCancelRpc) {
        setActionMessage(cancelError.message);
        return;
      }

      const currentStatus = await loadConvocationStatus();
      if (!currentStatus) return;

      if (currentStatus === "dismissed") {
        setActionMessage("Convocatória já está rejeitada.");
        return;
      }

      const { error: rejectError } = await supabase.rpc("set_convocation_status", {
        p_convocation_id: convocationId,
        p_status: "dismissed",
      });

      const rejectMessage = rejectError?.message?.toLowerCase() ?? "";
      const requiresReopenFallback =
        currentStatus === "accepted" &&
        rejectMessage.includes("only open convocations can be closed");

      if (requiresReopenFallback) {
        const { error: reopenError } = await supabase.rpc(
          "set_convocation_status",
          {
            p_convocation_id: convocationId,
            p_status: "open",
          },
        );

        if (reopenError) {
          setActionMessage(reopenError.message);
          return;
        }

        const { error: dismissAfterReopenError } = await supabase.rpc(
          "set_convocation_status",
          {
            p_convocation_id: convocationId,
            p_status: "dismissed",
          },
        );

        if (dismissAfterReopenError) {
          setActionMessage(dismissAfterReopenError.message);
          return;
        }

        setActionMessage("Convocatória rejeitada.");
        navigate("/profile", { replace: true });
        return;
      }

      if (rejectError) {
        setActionMessage(rejectError.message);
      } else {
        setActionMessage("Convocatória rejeitada.");
        navigate("/profile", { replace: true });
      }
    } finally {
      setActionState("idle");
    }
  }, [convocationId, navigate]);

  const handleAcceptGame = useCallback(async () => {
    if (!convocationId || !supabase) return;
    setActionState("accepting");
    setActionMessage(null);
    let acceptedInThisFlow = false;
    try {
      const currentStatus = await loadConvocationStatus();
      if (!currentStatus) return;

      if (currentStatus === "dismissed") {
        setActionMessage(
          "Convocatória rejeitada. Reabra a convocatória antes de criar o jogo.",
        );
        return;
      }

      if (currentStatus === "open") {
        const { error: acceptError } = await supabase.rpc(
          "set_convocation_status",
          {
            p_convocation_id: convocationId,
            p_status: "accepted",
          },
        );
        if (acceptError) {
          setActionMessage(acceptError.message);
          return;
        }
        acceptedInThisFlow = true;
      }

      const scheduledAtIso = buildScheduledAt();
      const { error: rpcError } = await supabase.rpc(
        "create_game_from_convocation_with_teams",
        {
          p_convocation_id: convocationId,
          p_scheduled_at: scheduledAtIso,
          p_shirts: buildLineupPayload(teamPlayers.shirts),
          p_coletes: buildLineupPayload(teamPlayers.coletes),
        },
      );

      if (rpcError) {
        const isMissingTeamsRpc =
          rpcError.message
            ?.toLowerCase()
            .includes("create_game_from_convocation_with_teams") ?? false;

        if (isMissingTeamsRpc) {
          const { error: legacyCreateError } = await supabase.rpc(
            "create_game_from_convocation",
            {
              p_convocation_id: convocationId,
              p_scheduled_at: scheduledAtIso,
            },
          );

          if (!legacyCreateError) {
            setActionMessage("Jogo criado com sucesso.");
            navigate("/profile", { replace: true });
            return;
          }

          setActionMessage(legacyCreateError.message);
          return;
        }

        if (acceptedInThisFlow) {
          const { error: rollbackError } = await supabase.rpc(
            "set_convocation_status",
            {
              p_convocation_id: convocationId,
              p_status: "open",
            },
          );
          if (rollbackError) {
            console.error(
              "Failed to rollback convocation to open after game creation error:",
              rollbackError,
            );
          }
        }
        setActionMessage(rpcError.message);
      } else {
        setActionMessage("Jogo criado com sucesso.");
        navigate("/profile", { replace: true });
      }
    } finally {
      setActionState("idle");
    }
  }, [convocationId, navigate, teamPlayers.coletes, teamPlayers.shirts, timeValue]);

  useEffect(() => {
    if (!convocationId) {
      setError("Convocatória não encontrada.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
        const response = await fetch(
          `${apiUrl.replace(/\/$/, "")}/convocations/${convocationId}/teams`,
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = (await response.json()) as TeamsResponse;
        if (!isMounted) return;

        setTeamName(data.teamName ?? "Equipa");
        setScheduledAt(data.scheduledAt ?? null);
        setTimeValue(formatTime(data.scheduledAt));
        setTeamPlayers({
          shirts: data.teams?.shirts ?? [],
          coletes: data.teams?.coletes ?? [],
        });
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Falha ao carregar equipes.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchTeams();
    return () => {
      isMounted = false;
    };
  }, [convocationId]);

  const addGuest = (team: "shirts" | "coletes") => {
    const guestIndex =
      team === "shirts" ? guestCountShirts + 1 : guestCountColetes + 1;
    const newGuest = {
      id: `guest-${team}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      name: `Convidado ${guestIndex}`,
    };
    setTeamPlayers((prev) => ({
      ...prev,
      [team]: [...prev[team], newGuest],
    }));
    if (team === "shirts") {
      setGuestCountShirts(guestIndex);
    } else {
      setGuestCountColetes(guestIndex);
    }
  };

  const value = useMemo(
    () => ({
      convocationId,
      sessionUserId,
      teamName,
      dateLabel,
      timeValue,
      setTimeValue,
      showTimePicker,
      setShowTimePicker,
      teamPlayers,
      setTeamPlayers,
      dragging,
      setDragging,
      dragOver,
      setDragOver,
      actionState,
      actionMessage,
      loading,
      error,
      statRows,
      addGuest,
      handleRejectGame,
      handleAcceptGame,
    }),
    [
      convocationId,
      sessionUserId,
      teamName,
      dateLabel,
      timeValue,
      showTimePicker,
      teamPlayers,
      dragging,
      dragOver,
      actionState,
      actionMessage,
      loading,
      error,
      statRows,
      handleRejectGame,
      handleAcceptGame,
    ],
  );

  return <GameFormContext.Provider value={value}>{children}</GameFormContext.Provider>;
}

export function useGameFormContext() {
  const context = useContext(GameFormContext);
  if (!context) {
    throw new Error("useGameFormContext must be used inside GameFormProvider.");
  }
  return context;
}
