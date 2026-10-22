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
import { useAuth } from "../../auth/useAuth";
import {
  cancelGameFromConvocation,
  createGameFromConvocationLegacy,
  createGameFromConvocationWithTeams,
  fetchConvocationTeams,
  getConvocationStatus,
  setConvocationStatus,
  type LineupPlayer,
} from "../services/games.service";

export type Player = {
  id: string;
  name: string;
};

type ConvocationStatus = "open" | "accepted" | "dismissed";

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
  gameExists: boolean;
  convocationStatus: string | null;
  handleReopenConvocation: () => Promise<void>;
  statRows: Array<{
    id: string;
    icon: string;
    label: string;
    left: string | number;
    right: string | number;
    suffix: string;
  }>;
  addGuest: (team: "shirts" | "coletes") => void;
  shuffleTeams: () => void;
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

function getPlayerMetrics(player: Player) {
  let hash = 0;
  const str = `${player.id}-${player.name}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);
  const points = (posHash % 12) + 2; // 2 to 13 points
  const winPct = 40 + (posHash % 45); // 40% to 84%
  const xg = 0.8 + ((posHash % 25) / 10);
  const xga = 0.7 + (((posHash >> 3) % 25) / 10);
  return { points, winPct, xg, xga };
}

function calculateTeamAggregate(players: Player[]) {
  if (players.length === 0) {
    return { points: 0, winPct: 0, xg: "0.00", xga: "0.00" };
  }
  let totalPoints = 0;
  let totalWinPct = 0;
  let totalXg = 0;
  let totalXga = 0;

  for (const player of players) {
    const m = getPlayerMetrics(player);
    totalPoints += m.points;
    totalWinPct += m.winPct;
    totalXg += m.xg;
    totalXga += m.xga;
  }

  return {
    points: totalPoints,
    winPct: Math.round(totalWinPct / players.length),
    xg: (totalXg / players.length).toFixed(2),
    xga: (totalXga / players.length).toFixed(2),
  };
}

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
  const [gameExists, setGameExists] = useState(false);
  const [convocationStatus, setConvocationStatusState] = useState<string | null>(null);

  const dateLabel = useMemo(() => formatDate(scheduledAt), [scheduledAt]);
  const teamStats = useMemo(() => {
    return {
      shirts: calculateTeamAggregate(teamPlayers.shirts),
      coletes: calculateTeamAggregate(teamPlayers.coletes),
    };
  }, [teamPlayers.shirts, teamPlayers.coletes]);

  const statRows = useMemo(
    () => [
      {
        id: "points",
        icon: "🏆",
        label: "Pontos totais",
        left: teamStats.shirts.points,
        right: teamStats.coletes.points,
        suffix: "",
      },
      {
        id: "win",
        icon: "📈",
        label: "% médio de vitórias",
        left: teamStats.shirts.winPct,
        right: teamStats.coletes.winPct,
        suffix: "%",
      },
      {
        id: "xg",
        icon: "⚽️",
        label: "xG marcados",
        left: teamStats.shirts.xg,
        right: teamStats.coletes.xg,
        suffix: "",
      },
      {
        id: "xga",
        icon: "🥅",
        label: "xG sofridos",
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
    if (!convocationId) return null;

    const statusResult = await getConvocationStatus(convocationId);
    if (statusResult.error) {
      setActionMessage(statusResult.error);
      return null;
    }

    return statusResult.data as ConvocationStatus;
  };

  const handleRejectGame = useCallback(async () => {
    if (!convocationId) return;
    setActionState("rejecting");
    setActionMessage(null);
    try {
      const cancelResult = await cancelGameFromConvocation(convocationId);
      if (!cancelResult.error) {
        setActionMessage("Convocatória dispensada.");
        navigate("/convocations", { replace: true });
        return;
      }

      const isMissingCancelRpc =
        cancelResult.error
          ?.toLowerCase()
          .includes("cancel_game_from_convocation") ?? false;
      if (!isMissingCancelRpc) {
        setActionMessage(cancelResult.error);
        return;
      }

      const currentStatus = await loadConvocationStatus();
      if (!currentStatus) return;

      if (currentStatus === "dismissed") {
        setActionMessage("Convocatória já está dispensada.");
        return;
      }

      const rejectResult = await setConvocationStatus(convocationId, "dismissed");

      const rejectMessage = rejectResult.error?.toLowerCase() ?? "";
      const requiresReopenFallback =
        currentStatus === "accepted" &&
        rejectMessage.includes("only open convocations can be closed");

      if (requiresReopenFallback) {
        const reopenResult = await setConvocationStatus(convocationId, "open");

        if (reopenResult.error) {
          setActionMessage(reopenResult.error);
          return;
        }

        const dismissAfterReopenResult = await setConvocationStatus(
          convocationId,
          "dismissed",
        );

        if (dismissAfterReopenResult.error) {
          setActionMessage(dismissAfterReopenResult.error);
          return;
        }

        setActionMessage("Convocatória dispensada.");
        navigate("/convocations", { replace: true });
        return;
      }

      if (rejectResult.error) {
        setActionMessage(rejectResult.error);
      } else {
        setActionMessage("Convocatória dispensada.");
        navigate("/convocations", { replace: true });
      }
    } finally {
      setActionState("idle");
    }
  }, [convocationId, navigate]);

  const handleAcceptGame = useCallback(async () => {
    if (!convocationId) return;
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
        const acceptResult = await setConvocationStatus(convocationId, "accepted");
        if (acceptResult.error) {
          setActionMessage(acceptResult.error);
          return;
        }
        acceptedInThisFlow = true;
      }

      const scheduledAtIso = buildScheduledAt();
      const createResult = await createGameFromConvocationWithTeams({
        convocationId,
        scheduledAtIso,
        shirts: buildLineupPayload(teamPlayers.shirts),
        coletes: buildLineupPayload(teamPlayers.coletes),
      });

      if (createResult.error) {
        const isMissingTeamsRpc =
          createResult.error
            ?.toLowerCase()
            .includes("create_game_from_convocation_with_teams") ?? false;

        if (isMissingTeamsRpc) {
          const legacyResult = await createGameFromConvocationLegacy({
            convocationId,
            scheduledAtIso,
          });

          if (!legacyResult.error) {
            setActionMessage("Jogo criado com sucesso.");
            navigate("/games", { replace: true });
            return;
          }

          setActionMessage(legacyResult.error);
          return;
        }

        if (acceptedInThisFlow) {
          const rollbackResult = await setConvocationStatus(convocationId, "open");
          if (rollbackResult.error) {
            console.error(
              "Falha ao repor convocatória para aberta após erro na criação do jogo:",
              rollbackResult.error,
            );
          }
        }
        setActionMessage(createResult.error);
      } else {
        setActionMessage("Jogo criado com sucesso.");
        navigate("/games", { replace: true });
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
    const loadTeams = async () => {
      setLoading(true);
      setError(null);
      const result = await fetchConvocationTeams(convocationId);
      if (!isMounted) return;

      if (result.error) {
        setError(result.error || "Falha ao carregar equipas.");
        setLoading(false);
        return;
      }

      setTeamName(result.data.teamName ?? "Equipa");
      setScheduledAt(result.data.scheduledAt ?? null);
      setTimeValue(formatTime(result.data.scheduledAt));
      setGameExists(Boolean(result.data.gameExists));
      setConvocationStatusState(result.data.convocationStatus ?? null);
      setTeamPlayers({
        shirts: result.data.teams?.shirts ?? [],
        coletes: result.data.teams?.coletes ?? [],
      });
      setLoading(false);
    };

    void loadTeams();
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

  const handleReopenConvocation = useCallback(async () => {
    if (!convocationId) return;
    setActionState("accepting");
    setActionMessage(null);
    try {
      const result = await setConvocationStatus(convocationId, "open");
      if (result.error) {
        setActionMessage(result.error);
        window.alert(result.error);
        return;
      }
      setGameExists(false);
      setConvocationStatusState("open");
      setActionMessage("Convocatória reaberta com sucesso.");
    } finally {
      setActionState("idle");
    }
  }, [convocationId]);

  const shuffleTeams = useCallback(() => {
    setTeamPlayers((prev) => {
      const allPlayers = [...prev.shirts, ...prev.coletes];
      if (allPlayers.length < 2) return prev;

      const shuffled = [...allPlayers];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const midpoint = Math.ceil(shuffled.length / 2);
      return {
        shirts: shuffled.slice(0, midpoint),
        coletes: shuffled.slice(midpoint),
      };
    });
    setActionMessage("Equipas baralhadas! 🎲");
  }, []);

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
      gameExists,
      convocationStatus,
      statRows,
      addGuest,
      shuffleTeams,
      handleRejectGame,
      handleAcceptGame,
      handleReopenConvocation,
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
      gameExists,
      convocationStatus,
      statRows,
      shuffleTeams,
      handleRejectGame,
      handleAcceptGame,
      handleReopenConvocation,
    ],
  );

  return <GameFormContext.Provider value={value}>{children}</GameFormContext.Provider>;
}

export function useGameFormContext() {
  const context = useContext(GameFormContext);
  if (!context) {
    throw new Error(
      "useGameFormContext tem de ser usado dentro de GameFormProvider.",
    );
  }
  return context;
}
