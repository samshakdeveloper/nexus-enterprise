import { describe, expect, it, vi, beforeEach } from "vitest";
import { EmailWorkerHandler } from "../../src/handlers/email-worker.handler.js";

describe("EmailWorkerHandler Unit Tests", () => {
  let handler: EmailWorkerHandler;
  let mockRedis: any;
  let mockMailProvider: any;
  let mockPublisher: any;
  let mockConsumer: any;

  beforeEach(() => {
    mockRedis = { set: vi.fn(), del: vi.fn() };
    mockMailProvider = { send: vi.fn() };
    mockPublisher = { publish: vi.fn() };
    mockConsumer = { commitOffsets: vi.fn() };

    handler = new EmailWorkerHandler(mockRedis, mockMailProvider, mockPublisher, mockConsumer);
  });

  it("should skip duplicate events when Redis idempotency check fails", async () => {
    mockRedis.set.mockResolvedValue(null); // یعنی کلید تکراری است

    const payload = {
      message: {
        offset: "10",
        value: Buffer.from(JSON.stringify({ eventId: "ev_1", type: "USER_CREATED" })),
      },
    } as any;

    await handler.handleMessage(payload);

    expect(mockMailProvider.send).not.toHaveBeenCalled();
    expect(mockConsumer.commitOffsets).toHaveBeenCalledWith([{ topic: undefined, partition: undefined, offset: "11" }]);
  });
});
