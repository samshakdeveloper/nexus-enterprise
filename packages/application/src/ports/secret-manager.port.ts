export interface SecretManagerPort {
  getSecret<T>(secretName: string): Promise<T>;
}
