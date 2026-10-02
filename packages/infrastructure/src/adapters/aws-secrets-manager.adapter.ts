// packages/infrastructure/src/adapters/aws-secrets-manager.adapter.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { SecretManagerPort } from "@nexus/application";

export class AwsSecretsManagerAdapter implements SecretManagerPort {
  private client: SecretsManagerClient;

  constructor(region: string) {
    this.client = new SecretsManagerClient({ region });
  }

  async getSecret<T>(secretName: string): Promise<T> {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} is empty or invalid.`);
    }

    return JSON.parse(response.SecretString) as T;
  }
}
