import type { ReactNode } from "react";
import type { AgentId } from "./agents";
import {
  ImageIcon,
  PencilIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  SparkleIcon,
  type IconProps,
} from "../ui/icons";

const ICONS: Record<AgentId, (p: IconProps) => ReactNode> = {
  research: SearchIcon,
  verify: ShieldCheckIcon,
  write: PencilIcon,
  edit: SparkleIcon,
  illustrate: ImageIcon,
  publish: SendIcon,
};

export interface AgentIconProps extends IconProps {
  agent: AgentId;
}

/** Renders the line icon for a pipeline agent (search, shield, pencil…). */
export function AgentIcon({ agent, ...props }: AgentIconProps) {
  const Icon = ICONS[agent];
  return <Icon {...props} />;
}
