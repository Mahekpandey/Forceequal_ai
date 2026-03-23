export function ensureTimelineFields(parsed: Record<string, unknown>): {
  progressNote: string;
  thinkingSteps: string[];
} {
  const progressNote =
    typeof parsed.progressNote === 'string' && parsed.progressNote.trim()
      ? parsed.progressNote.trim().slice(0, 500)
      : 'Completed this pipeline stage.';
  const thinkingSteps = Array.isArray(parsed.thinkingSteps)
    ? (parsed.thinkingSteps as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((s) => s.trim().slice(0, 220))
        .slice(0, 8)
    : [];
  return { progressNote, thinkingSteps };
}
