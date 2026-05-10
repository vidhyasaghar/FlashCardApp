import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { runMigrations } from './migrations';
import { createProfile, getAllProfiles } from './queries/profiles';
import { createDeck, getDecksByProfile } from './queries/decks';
import { createCard, getCardsByDeck } from './queries/cards';
import { getOrCreateCardStats, updateCardStats, getDueCards } from './queries/cardStats';
import { insertReviewLog, getReviewHistoryForCard } from './queries/reviewLog';
import { calculateSM2 } from '../engine/sm2';

type Logger = (line: string) => void;

function makeCheckers(log: Logger) {
  function check(condition: boolean, description: string): void {
    const line = `${condition ? '✓' : '✗'} ${description}`;
    log(line);
    if (!condition) throw new Error(line);
  }

  function checkEq<T>(actual: T, expected: T, description: string): void {
    const passed = actual === expected;
    const line = passed
      ? `✓ ${description}`
      : `✗ ${description} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`;
    log(line);
    if (!passed) throw new Error(line);
  }

  return { check, checkEq };
}

export async function runDataLayerTests(log: Logger = console.log): Promise<void> {
  const { check, checkEq } = makeCheckers(log);
  const db = await SQLite.openDatabaseAsync(':memory:');

  // ── Migrations ──────────────────────────────────────────────────────────────
  await runMigrations(db);

  // Wipe all rows in FK-safe order so the test is idempotent across hot reloads.
  // openDatabaseAsync(':memory:') reuses the same native connection by name,
  // so state from previous runs accumulates without this.
  await db.execAsync(`
    DELETE FROM review_log;
    DELETE FROM card_stats;
    DELETE FROM cards;
    DELETE FROM decks;
    DELETE FROM profiles;
  `);

  // ── Profiles ─────────────────────────────────────────────────────────────────
  const pinHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    '1234'
  );
  const profile = await createProfile(db, 'TestUser', pinHash);
  checkEq(profile.name, 'TestUser', 'profiles: createProfile name is TestUser');
  check(typeof profile.id === 'number' && profile.id > 0, 'profiles: createProfile id is a positive number');
  checkEq(profile.pin_hash, pinHash, 'profiles: createProfile stores pin_hash');

  const allProfiles = await getAllProfiles(db);
  checkEq(allProfiles.length, 1, 'profiles: getAllProfiles returns 1 profile');
  checkEq(allProfiles[0].name, 'TestUser', 'profiles: getAllProfiles[0] name is TestUser');

  // ── Decks ─────────────────────────────────────────────────────────────────────
  const deck = await createDeck(db, profile.id, 'Spanish Vocab', 'Basic words');
  checkEq(deck.title, 'Spanish Vocab', 'decks: createDeck title is Spanish Vocab');
  checkEq(deck.description, 'Basic words', 'decks: createDeck description is Basic words');
  checkEq(deck.profile_id, profile.id, 'decks: createDeck profile_id matches profile');
  checkEq(deck.card_direction, 'front_to_back', 'decks: createDeck card_direction defaults to front_to_back');

  const profileDecks = await getDecksByProfile(db, profile.id);
  checkEq(profileDecks.length, 1, 'decks: getDecksByProfile returns 1 deck');
  checkEq(profileDecks[0].title, 'Spanish Vocab', 'decks: getDecksByProfile returns Spanish Vocab deck');

  // ── Cards ─────────────────────────────────────────────────────────────────────
  const card1 = await createCard(db, deck.id, 'Hola', 'Hello');
  const card2 = await createCard(db, deck.id, 'Gracias', 'Thank you');
  const card3 = await createCard(db, deck.id, 'Adiós', 'Goodbye');

  const deckCards = await getCardsByDeck(db, deck.id);
  checkEq(deckCards.length, 3, 'cards: getCardsByDeck returns 3 cards');
  checkEq(deckCards[0].front, 'Hola', 'cards: card1 front is Hola');
  checkEq(deckCards[1].front, 'Gracias', 'cards: card2 front is Gracias');
  checkEq(deckCards[2].front, 'Adiós', 'cards: card3 front is Adiós');

  // ── Card Stats ────────────────────────────────────────────────────────────────
  const stats1 = await getOrCreateCardStats(db, card1.id, profile.id);
  const stats2 = await getOrCreateCardStats(db, card2.id, profile.id);
  const stats3 = await getOrCreateCardStats(db, card3.id, profile.id);

  for (const [stats, label] of [
    [stats1, 'card1'],
    [stats2, 'card2'],
    [stats3, 'card3'],
  ] as const) {
    checkEq(stats.ease_factor, 2.5, `card_stats: ${label} ease_factor defaults to 2.5`);
    checkEq(stats.interval_days, 1, `card_stats: ${label} interval_days defaults to 1`);
    checkEq(stats.total_reviews, 0, `card_stats: ${label} total_reviews defaults to 0`);
    checkEq(stats.correct_count, 0, `card_stats: ${label} correct_count defaults to 0`);
    checkEq(stats.current_streak, 0, `card_stats: ${label} current_streak defaults to 0`);
    check(stats.last_reviewed === null, `card_stats: ${label} last_reviewed defaults to null`);
  }

  // ── SM-2 Engine ───────────────────────────────────────────────────────────────
  // calculateSM2(2.5, 1, 1): interval = ceil(1 * 2.5) = 3, ease = 2.5 + 0.1 = 2.6
  const correct = calculateSM2(2.5, 1, 1);
  checkEq(correct.newIntervalDays, 3, 'sm2: calculateSM2(2.5,1,1) newIntervalDays');
  checkEq(
    Math.round(correct.newEaseFactor * 10) / 10,
    2.6,
    'sm2: calculateSM2(2.5,1,1) newEaseFactor = 2.6'
  );
  check(
    correct.newDueDate > Math.floor(Date.now() / 1000),
    'sm2: calculateSM2(2.5,1,1) newDueDate is in the future'
  );

  // calculateSM2(2.5, 1, 0): interval = 1, ease = max(1.3, 2.5 - 0.2) = 2.3
  const incorrect = calculateSM2(2.5, 1, 0);
  checkEq(incorrect.newIntervalDays, 1, 'sm2: calculateSM2(2.5,1,0) newIntervalDays');
  checkEq(
    Math.round(incorrect.newEaseFactor * 10) / 10,
    2.3,
    'sm2: calculateSM2(2.5,1,0) newEaseFactor'
  );

  // ── Full Review Cycle ─────────────────────────────────────────────────────────
  const { newEaseFactor, newIntervalDays, newDueDate } = calculateSM2(
    stats1.ease_factor,
    stats1.interval_days,
    1
  );
  await updateCardStats(db, card1.id, profile.id, newEaseFactor, newIntervalDays, newDueDate, 1);
  await insertReviewLog(db, card1.id, profile.id, 1, stats1.interval_days, newIntervalDays);

  const history = await getReviewHistoryForCard(db, card1.id, profile.id);
  checkEq(history.length, 1, 'review: getReviewHistoryForCard returns 1 log entry');
  checkEq(history[0].result, 1, 'review: log result is 1');
  checkEq(history[0].interval_before, 1, 'review: log interval_before is 1');
  checkEq(history[0].interval_after, newIntervalDays, 'review: log interval_after matches SM2 output');

  const updatedStats = await getOrCreateCardStats(db, card1.id, profile.id);
  checkEq(updatedStats.total_reviews, 1, 'review: total_reviews incremented to 1');
  checkEq(updatedStats.correct_count, 1, 'review: correct_count incremented to 1');
  checkEq(updatedStats.current_streak, 1, 'review: current_streak incremented to 1');
  check(updatedStats.last_reviewed !== null, 'review: last_reviewed is set after update');

  // ── getDueCards ───────────────────────────────────────────────────────────────
  // card2 and card3 are due (default due_date = now); card1 was pushed 3 days forward.
  const dueCards = await getDueCards(db, deck.id, profile.id);
  checkEq(dueCards.length, 2, 'getDueCards: returns 2 due cards (card2 and card3)');
  check(
    dueCards.every(c => c.deck_id === deck.id),
    'getDueCards: all cards belong to correct deck'
  );
  check(dueCards.some(c => c.front === 'Gracias'), 'getDueCards: Gracias is due');
  check(dueCards.some(c => c.front === 'Adiós'), 'getDueCards: Adiós is due');

  await db.closeAsync();

  log('✓ ALL TESTS PASSED');
}
