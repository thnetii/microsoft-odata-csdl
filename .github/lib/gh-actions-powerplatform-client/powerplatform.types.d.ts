import type { randomUUID } from 'node:crypto';

type UUID = ReturnType<typeof randomUUID>;

export type PowerAutomateResource<TProperties> = {
  name: string;
  id: string;
  type: string;
  properties: TProperties;
};

export type PowerAutomatePrincipalReference = {
  id: string;
  displayName: string;
  type: string;
};

export type PowerAutomateEnvironmentProperties = {
  displayName: string;
  createdTime: string;
  createdBy: PowerAutomatePrincipalReference;
  lastModifiedTime: string;
  provisioningState: string;
  creationType: string;
  environmentSku: string;
  environmentType: string;
  isDefault: boolean;
  isPayAsYouGoEnabled: boolean;
  azureRegionHint: string;
  runtimeEndpoints: {
    'microsoft.BusinessAppPlatform': string;
    'microsoft.CommonDataModel': string;
    'microsoft.PowerApps': string;
    'microsoft.PowerAppsAdvisor': string;
    'microsoft.PowerVirtualAgents': string;
    'microsoft.ApiManagement': string;
    'microsoft.Flow': string;
  };
  linkedEnvironmentMetadata?: {
    type: string;
    resourceId: UUID;
    friendlyName: string;
    uniqueName: string;
    domainName: string;
    version: string;
    instanceUrl: `https://${string}/`;
    instanceApiUrl: `https://${string}`;
    baseLanguage: number;
    instanceState: string;
    createdTime: string;
  };
};

export type PowerAutomateEnvironmentInfo = {
  location: string;
} & PowerAutomateResource<PowerAutomateEnvironmentProperties>;

export type PowerAutomateApiBasicProperties = {
  displayName: string;
  iconUri;
  purpose: string;
  connectionParameters: Record<string, object>;
  runtimeUrls: string[];
  primaryRuntimeUrl: string;
  metadata: {
    source: string;
    brandColor: string;
    useNewApimVersion: boolean;
    version: {
      current: string;
      previous: string;
    };
  };
  capabilities: string[];
  tier: string;
  isCustomApi: string;
  description: string;
  createdTime: string;
  changedTime: string;
  publisher: string;
};

export type PowerAutomateApiDetailProperties = {
  swagger: object;
} & PowerAutomateApiBasicProperties;

export type PowerAutomateApiBasicInfo =
  PowerAutomateResource<PowerAutomateApiBasicProperties>;

export type PowerAutomateApiCollection = {
  value: PowerAutomateApiBasicInfo[];
};

export type PowerAutomateApiDetailInfo =
  PowerAutomateResource<PowerAutomateApiDetailProperties>;
