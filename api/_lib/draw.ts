import crypto from 'node:crypto';

/**
 * Generates a single closed-cycle derangement (Hamiltonian cycle) for participant IDs.
 * Every participant draws the next one in a cryptographically shuffled cycle:
 * - Nobody draws themselves.
 * - Everyone is drawn by exactly one person.
 * - There are no isolated sub-cycles (everyone belongs to a single closed loop).
 */
export function generateClosedCycleDraw(participantIds: string[]): Map<string, string> {
  if (participantIds.length < 3) {
    throw new Error('São necessários pelo menos 3 participantes para realizar o sorteio.');
  }

  const uniqueIds = Array.from(new Set(participantIds));
  if (uniqueIds.length !== participantIds.length) {
    throw new Error('A lista de participantes contém identificadores duplicados.');
  }

  // Fisher-Yates shuffle with crypto.randomInt
  const shuffled = [...uniqueIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // Create closed cycle: shuffled[i] -> shuffled[(i + 1) % n]
  const pairs = new Map<string, string>();
  for (let i = 0; i < shuffled.length; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % shuffled.length];
    pairs.set(giver, receiver);
  }

  return pairs;
}

/**
 * Hashes a 4-digit PIN using SHA-256 with the participant ID as salt.
 */
export function hashPin(pin: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${pin.trim()}`)
    .digest('hex');
}

/**
 * Validates that a PIN is either empty/null or exactly 4 numeric digits.
 */
export function isValidPin(pin: string | null | undefined): boolean {
  if (!pin) return true;
  return /^\d{4}$/.test(pin.trim());
}

/**
 * Generates a human-friendly uppercase alphanumeric invite code (avoiding ambiguous chars like 0/O, 1/I).
 */
export function generateInviteCode(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

/**
 * Generates a secure admin token for the organizer link.
 */
export function generateAdminToken(): string {
  return crypto.randomBytes(18).toString('base64url');
}
