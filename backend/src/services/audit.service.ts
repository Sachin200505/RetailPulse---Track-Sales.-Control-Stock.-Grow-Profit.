import AuditLog from "../models/AuditLog";

interface AuditPayload {
  action: string;
  user: string;
  meta?: any;
}

export const createAuditLog = async ({
  action,
  user,
  meta,
}: AuditPayload) => {
  try {
    await AuditLog.create({
      action,
      user,
      metadata: meta,
    });
  } catch (error) {
    console.error("Audit log failed", error);
  }
};
