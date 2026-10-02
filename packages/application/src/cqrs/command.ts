/**
 * Marker interface for Commands: an intent to change system state.
 * Commands are named imperatively ("CreateUserCommand") and carry only
 * primitive/plain data — never domain objects — so they can cross process
 * boundaries (HTTP body, queue message) without modification.
 */
export interface Command {
  readonly commandName: string;
}
