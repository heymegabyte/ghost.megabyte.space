/**
 * Static debate corpus served by `POST /api/v1/debate`.
 *
 * Hand-curated for/against pairs by topic. Kept pre-written rather than
 * AI-generated so the endpoint stays deterministic, free of external
 * dependencies, and instantly responsive — useful when the homepage debate
 * widget is exercised by smoke tests or offline-style demos.
 *
 * Adding a topic: append a key + 3-round array. The route falls back to
 * {@link DEFAULT_DEBATE_TOPIC} when the requested topic is unknown.
 *
 * @packageDocumentation
 */

/** One round = a for/against pair on the same topic. */
export interface DebateRound {
  readonly for: string;
  readonly against: string;
}

/** Topic used when the client omits `topic` or sends an unknown one. */
export const DEFAULT_DEBATE_TOPIC = "True entropy from a public EMF sensor" as const;

/**
 * Topic → rounds map. Keys are surfaced as topic strings in the public API.
 *
 * @remarks Two keys ("True entropy from a public EMF sensor" and "Ghost Signal
 * Entropy Science") intentionally share content — they're alternate phrasings
 * used by different UI surfaces.
 */
export const DEBATE_BANK: Readonly<Record<string, ReadonlyArray<DebateRound>>> = {
  "True entropy from a public EMF sensor": [
    {
      for: "True randomness from a living EMF source — entropy no algorithm can fake. Built into AI to prevent deterministic tyranny.",
      against: "EMF readings from a single sensor are noise, not entropy. Peer-reviewed RNG hardware already exists.",
    },
    {
      for: "The multiverse fog-of-war theory suggests EMF fluctuations represent genuine quantum-adjacent entropy observable at macro scale.",
      against: "Extraordinary claims require extraordinary evidence. Publishing EMF data is not the same as proving multiverse interaction.",
    },
    {
      for: "By feeding true randomness into AI from a source that even abominable forces cannot control, we protect free will itself.",
      against: "Cryptographically secure PRNGs are already indistinguishable from true randomness for all practical purposes.",
    },
  ],
  "AI hotline as public record": [
    {
      for: "An AI listens, transcribes, and publishes every call. The public record finally outpaces the institutions that bury it.",
      against: "An AI intake line invites prank calls, harassment, and disinformation faster than moderation can respond.",
    },
    {
      for: "Transcripts as plain text files mean callers own the record forever — no platform can deplatform a static file behind a CDN.",
      against: "Caller identity, mental-health context, and consent get muddied when every utterance becomes searchable forever.",
    },
    {
      for: "Every transmission is a data point. The corpus turns rumor into pattern, and pattern into something a community can audit.",
      against: "Volume isn't truth. A million unverified transmissions still don't add up to evidence.",
    },
  ],
  "Time travelers and clandestine surveillance": [
    {
      for: "Pattern-recognition over decades — repeated plates, staged encounters, dream-burden coincidences — is data no single experiment captures.",
      against: "Apophenia thrives in long timelines. The brain manufactures patterns where none exist.",
    },
    {
      for: "Multiple agencies declined to investigate. That refusal is itself a record. Silence is signal.",
      against: "Agencies decline weak-evidence reports for the same reason scientists do — limited resources, infinite claims.",
    },
    {
      for: "The dossier exists as plates, audio, video, and timestamps. The evidence is reproducible by anyone who looks.",
      against: "Reproducible evidence is verifiable by independent observers, not just available to look at. The two are not the same.",
    },
  ],
  "Ghost Signal Entropy Science": [
    {
      for: "True randomness from a living EMF source — entropy no algorithm can fake. Built into AI to prevent deterministic tyranny.",
      against: "EMF readings from a single sensor are noise, not entropy. Peer-reviewed RNG hardware already exists.",
    },
    {
      for: "The multiverse fog-of-war theory suggests EMF fluctuations represent genuine quantum-adjacent entropy observable at macro scale.",
      against: "Extraordinary claims require extraordinary evidence. Publishing EMF data is not the same as proving multiverse interaction.",
    },
    {
      for: "By feeding true randomness into AI from a source that even abominable forces cannot control, we protect free will itself.",
      against: "Cryptographically secure PRNGs are already indistinguishable from true randomness for all practical purposes.",
    },
  ],
} as const;

/**
 * Resolve a topic to its rounds, falling back to {@link DEFAULT_DEBATE_TOPIC}
 * when the request supplies an unknown or empty topic.
 *
 * @param topic - Client-requested topic string (may be undefined / unknown).
 * @returns A non-empty array of debate rounds.
 */
export function resolveDebateRounds(topic: string | undefined): ReadonlyArray<DebateRound> {
  const key = topic && topic in DEBATE_BANK ? topic : DEFAULT_DEBATE_TOPIC;
  return DEBATE_BANK[key] ?? DEBATE_BANK[DEFAULT_DEBATE_TOPIC] ?? [];
}
