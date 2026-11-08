// Player-facing text for API error codes. Always pick the message by `error.code`, never by parsing `error.message`.

const MESSAGES: Record<string, string> = {
  // Network / server
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  SERVICE_UNAVAILABLE: "The game server is unavailable right now. Please try again soon.",
  SERVICE_NOT_READY: "The game server is unavailable right now. Please try again soon.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
  ORIGIN_NOT_ALLOWED: "This request was blocked. Reload the page and try again.",
  INVALID_JSON: "Something went wrong sending your request. Please try again.",
  UNSUPPORTED_MEDIA_TYPE: "Something went wrong sending your request. Please try again.",
  VALIDATION_ERROR: "Some fields need fixing.",

  // Auth
  UNAUTHENTICATED: "Your session has ended. Please log in again.",
  INVALID_CREDENTIALS: "Wrong username or password.",
  USERNAME_TAKEN: "That username is already taken.",

  // Runs
  NO_ACTIVE_SAVE: "You don't have a saved game.",
  RUN_NOT_FOUND: "That game couldn't be found.",
  ACTIVE_SAVE_EXISTS: "You already have a saved game.",
  START_REQUEST_CONFLICT: "Couldn't start a new game. Please try again.",
  DUPLICATE_ACTION: "That action was already done.",
  STALE_REVISION: "The game changed in another tab, so it was reloaded.",
  UNSUPPORTED_STATE_VERSION: "This save is from an older version and can't be loaded.",

  // Engine
  INVALID_PHASE: "You can't do that right now.",
  INVALID_TRANSITION: "You can't move to the next day yet.",
  EVENT_REQUIRED: "Answer today's event first.",
  NO_ACTION_LEFT: "You've already used today's action.",
  INSUFFICIENT_GOLD: "Not enough gold.",
  MAX_UPGRADE: "This is already at max level.",
  HP_FULL: "The city is already at full HP.",
  INVALID_CHOICE: "That choice isn't available.",
  EVENT_ALREADY_RESOLVED: "This event is already settled.",
  REWARD_ALREADY_CHOSEN: "You've already picked a reward.",
  BATTLE_INVALID: "The battle can't start right now.",
  BATTLE_ALREADY_RESOLVED: "This battle is already over.",
  GAME_ENDED: "This game is over.",
};

export function errorMessage(code: string): string {
  return MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR;
}

// Per-field text for VALIDATION_ERROR on the auth forms. Rules from app/docs/API_CONTRACT.md.
const FIELD_MESSAGES: Record<string, string> = {
  username: "Use 3–30 characters: a–z, numbers or underscore.",
  password: "Password must be 6–128 characters.",
  confirmPassword: "Passwords don't match.",
};

/** Turns `error.fields` from the API into messages to show under each input. */
export function fieldMessages(fields: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(Object.keys(fields).map((name) => [name, FIELD_MESSAGES[name] ?? fields[name]]));
}
