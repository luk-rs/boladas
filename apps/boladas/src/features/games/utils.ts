export const formatSchedule = (scheduledAt: string) => {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: "--", timeLabel: "--" };
  }

  const dateLabel = new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return { dateLabel, timeLabel };
};
