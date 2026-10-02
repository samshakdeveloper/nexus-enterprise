export interface RequestPipelineServerPort {
  listen(options: { port: number; host: string }): Promise<void>;
  close(): Promise<void>;
}
