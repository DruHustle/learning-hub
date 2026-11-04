import { useAuth } from "@/contexts/AuthContext";

export function useProgress() {
  const {
    progress,
    markAsCompleted,
    progressStatus,
    progressError,
    saving,
    pendingCount,
    retryProgress,
  } = useAuth();

  const isCompleted = (tutorialId: number) => {
    return progress?.completedTutorials?.includes(tutorialId) || false;
  };

  const getProgressPercentage = (totalTutorials: number) => {
    if (!progress?.completedTutorials) return 0;
    return Math.round(
      (progress.completedTutorials.length / totalTutorials) * 100
    );
  };

  return {
    progress,
    markAsCompleted,
    isCompleted,
    getProgressPercentage,
    progressStatus,
    progressError,
    saving,
    pendingCount,
    retryProgress,
  };
}
