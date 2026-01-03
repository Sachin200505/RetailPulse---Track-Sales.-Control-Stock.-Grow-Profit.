interface AuditPayload {
    action: string;
    user: string;
    meta?: any;
}
export declare const createAuditLog: ({ action, user, meta, }: AuditPayload) => Promise<void>;
export {};
//# sourceMappingURL=audit.service.d.ts.map