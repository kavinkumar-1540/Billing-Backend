import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export interface AppConfig {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  /** seconds */
  jwtAccessExpiresInSeconds: number;
  /** seconds */
  jwtRefreshExpiresInSeconds: number;
  frontendUrl: string;
  nodeEnv: string;
}

interface RawConfigFile {
  app?: { port?: number; nodeEnv?: string; frontendUrl?: string };
  mongodb?: { uri?: string };
  jwt?: {
    accessSecret?: string;
    refreshSecret?: string;
    accessExpiresInSeconds?: number;
    refreshExpiresInSeconds?: number;
  };
}

function loadYamlFile(path: string): RawConfigFile {
  if (!existsSync(path)) return {};
  const contents = readFileSync(path, 'utf8');
  return (yaml.load(contents) as RawConfigFile) ?? {};
}

function deepMerge(
  base: RawConfigFile,
  override: RawConfigFile,
): RawConfigFile {
  return {
    app: { ...base.app, ...override.app },
    mongodb: { ...base.mongodb, ...override.mongodb },
    jwt: { ...base.jwt, ...override.jwt },
  };
}

/**
 * Config source of truth is YAML, not process.env. config.yaml (committed,
 * safe defaults) is merged with config.local.yaml (gitignored) and
 * config.<NODE_ENV>.yaml if present, in that order — later files win.
 */
export default (): { app: AppConfig } => {
  const configDir = join(process.cwd(), 'config');
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  let merged = loadYamlFile(join(configDir, 'config.yaml'));
  merged = deepMerge(
    merged,
    loadYamlFile(join(configDir, `config.${nodeEnv}.yaml`)),
  );
  merged = deepMerge(
    merged,
    loadYamlFile(join(configDir, 'config.local.yaml')),
  );

  return {
    app: {
      port: merged.app?.port ?? 5000,
      nodeEnv: merged.app?.nodeEnv ?? nodeEnv,
      frontendUrl: merged.app?.frontendUrl ?? 'http://localhost:5173',
      mongodbUri:
        merged.mongodb?.uri ?? 'mongodb://127.0.0.1:27017/billing-suite',
      jwtSecret: merged.jwt?.accessSecret ?? 'dev-access-secret-change-me',
      jwtRefreshSecret:
        merged.jwt?.refreshSecret ?? 'dev-refresh-secret-change-me',
      jwtAccessExpiresInSeconds: merged.jwt?.accessExpiresInSeconds ?? 900,
      jwtRefreshExpiresInSeconds: merged.jwt?.refreshExpiresInSeconds ?? 604800,
    },
  };
};
