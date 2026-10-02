import { SystemClockPort } from "@nexus/shared";

export class SystemClockAdapter implements SystemClockPort {
  now(): Date {
    return new Date();
  }
}
