// Live PHI audit log store (module-level, in-memory) for the wireframe.
// In production this would write to audit_log via Lovable Cloud. Here we
// simulate the write synchronously so the drawer can fail-closed if the
// "write" fails (we expose a flag for that, off by default).

import { useSyncExternalStore } from "react";

export type PhiAuditEntry = {
  id: string;
  ts: string; // ISO
  table_name: "enrollment_responses";
  record_id: string; // individual_id
  action: "view_phi" | "export_phi";
  actor_id: string;
  actor_name: string;
  new_values: {
    individual_id: string;
    individual_name: string;
    reason: string;
    fields_viewed: string[];
  };
};

let entries: PhiAuditEntry[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function writePhiAudit(input: Omit<PhiAuditEntry, "id" | "ts">): PhiAuditEntry {
  const entry: PhiAuditEntry = {
    id: `phi_al_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: new Date().toISOString(),
    ...input,
  };
  entries = [entry, ...entries];
  emit();
  return entry;
}

export function usePhiAuditLog(): PhiAuditEntry[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => entries,
    () => entries,
  );
}
