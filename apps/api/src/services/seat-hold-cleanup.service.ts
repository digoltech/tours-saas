import { prisma } from "../config/prisma.js";

const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | undefined;

export async function releaseExpiredSeatHolds(now = new Date()) {
  return prisma.tripSeat.updateMany({
    where: { status: "HELD", holdExpiresAt: { lte: now } },
    data: {
      status: "AVAILABLE",
      holdToken: null,
      heldById: null,
      holdExpiresAt: null,
    },
  });
}

export function startSeatHoldCleanup() {
  if (cleanupTimer) return cleanupTimer;
  const clean = () => {
    void releaseExpiredSeatHolds().catch((error) => {
      console.error("Unable to release expired seat holds", error);
    });
  };
  clean();
  cleanupTimer = setInterval(clean, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
  return cleanupTimer;
}
