import { Avatar, Badge, Card } from "@/components/ui";
import { SettingsSection } from "./settings-section";

/** One read-only labelled fact in the profile card. */
function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] text-secondary">{label}</span>
      <span className="text-[13.5px] font-medium text-ink">{value}</span>
    </div>
  );
}

/**
 * Profile / account — cosmetic and static. Auth is a single-tenant stub (locked
 * decision), so this section only reflects the demo identity; there is nothing
 * to edit and, deliberately, no key or credential field anywhere.
 */
export function ProfileSection() {
  return (
    <SettingsSection
      title="Profile & account"
      description="PostForge runs single-tenant. Authentication is a cosmetic stub, so account details are read-only."
    >
      <Card padded>
        <div className="flex items-center gap-4">
          <Avatar name="Demo User" size={52} />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-ink">Demo User</div>
            <div className="text-[13px] text-muted">demo@postforge.app</div>
          </div>
          <Badge tone="neutral" className="ml-auto">
            Single-tenant
          </Badge>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border-subtle pt-5">
          <ReadonlyRow label="Display name" value="Demo User" />
          <ReadonlyRow label="Email" value="demo@postforge.app" />
          <ReadonlyRow label="Workspace" value="PostForge" />
          <ReadonlyRow label="Plan" value="Local / self-hosted" />
        </div>
      </Card>
    </SettingsSection>
  );
}
