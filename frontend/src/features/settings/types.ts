import type { Organization } from "@/types/api";
import type { SettingsValues } from "@/schemas";

export type SettingsTab = "general" | "smtp" | "api" | "danger";

export type SettingsTabDefinition = {
  key: SettingsTab;
  label: string;
};

export type SettingsFormContext = {
  organization: Organization;
  values: SettingsValues;
  smtpFieldDisabled: boolean;
  smtpDisabledVisualClass: string;
};
