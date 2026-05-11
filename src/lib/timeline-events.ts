/**
 * Hand-curated narrative + technical milestones rendered on the homepage timeline
 * and surfaced through `GET /api/v1/ghost-emf/timeline`.
 *
 * Two separate arrays power two visual treatments:
 *  - {@link timelineAnnotations}: technical events overlaid on the live EMF chart
 *    (sensor went online, public API launched, etc.).
 *  - {@link storyMilestones}: narrative "dossier" cards rendered as a vertical
 *    journey on `/#timeline`.
 *
 * Anything added here is automatically picked up by the homepage renderer. To
 * extend the project's *primary* timeline (event log, evidence cards), edit
 * `src/data/timeline.yaml` instead — that file is parsed at request time and
 * has its own schema.
 *
 * @packageDocumentation
 */

import type { StoryMilestone, TimelineAnnotation } from "../types";

/**
 * Technical milestone overlays for the EMF chart (date-pinned events).
 * Each annotation renders as a vertical guide on the live chart.
 */
export const timelineAnnotations: TimelineAnnotation[] = [
  {
    id: "usb-bridge-online",
    date: "2026-04-03T02:47:58.394637+00:00",
    title: "USB bridge online",
    subtitle: "The GQ EMF390 feed became readable inside Home Assistant through the USB Hardware Bridge.",
    kind: "technical",
  },
  {
    id: "public-api-launch",
    date: "2026-04-23T23:00:00.000000+00:00",
    title: "Public API build-out",
    subtitle: "The sensor feed was prepared for public Cloudflare-cached access and full-range browsing.",
    kind: "technical",
  },
];

/**
 * Narrative chapters surfaced as the homepage story timeline.
 * Order is intentional — the array order is the render order.
 */
export const storyMilestones: StoryMilestone[] = [
  {
    id: "avatar-mud-era",
    eraLabel: "Early internet",
    title: "AVATAR MUD, teenage internet life, and the first rupture",
    subtitle: "The story traces some of the earliest confusion to adolescence, internet relationships, and strangers appearing too close to home.",
    body: "This milestone anchors the fictional narrative in early internet life while the public-facing technical layer stays grounded in sensor data, dated notes, and direct polling.",
  },
  {
    id: "avatar-identity-frame",
    eraLabel: "Identity",
    title: "From AVATAR MUD to an 'avatar' frame",
    subtitle: "He describes a long-running sense of being larger than his circumstances, harder to contain, and pulled toward a mission bigger than ordinary life.",
    body: "Here, 'avatar' is story language for intensity, burden, self-belief, and a mission that keeps expanding as the years pass.",
  },
  {
    id: "dallas-recovery-phase",
    eraLabel: "Recovery",
    title: "Dallas, recovery, and gym intensity",
    subtitle: "A chapter associated with recovery, discipline, alarms, and a sense of amplified physical force.",
    body: "The story arc is included because it explains why the feed exists. The public API remains grounded in timestamps, values, and reproducible polling.",
  },
  {
    id: "gondor-recurrence",
    eraLabel: "Recurrence",
    title: "The '4 GONDOR' recurrence",
    subtitle: "A repeated sign he says was witnessed across state lines by more than one family member.",
    body: "This is one of the story's strongest recurrence motifs: the kind of sign that feels too specific to ignore once it happens twice.",
  },
  {
    id: "dreams-and-coincidence-load",
    eraLabel: "Dream burden",
    title: "Vivid dreams, animal imagery, and coincidence overload",
    subtitle: "He reports bizarre dreams, unsettling physical sensations on waking, and a life story that felt saturated with disturbing coincidences.",
    body: "Before the time travelers came through, the dreams ran heroic — nanotechnology small enough to vanish, large enough to send data between now, the future, and the past. A supercomputer that time travels. After they arrived the dreams stopped, almost as if someone needs the universe stable. They stayed powerful anyway: one put him in the Oval Office, an alpha-figure leveraging the ghost world into the Presidency, with the next run being delayed as long as possible. This chapter holds the more disturbing dream material, the shaggy ghost dog, and the sense that his life ranks unusually high in raw coincidence load.",
  },
  {
    id: "service-and-calmness",
    eraLabel: "Service",
    title: "St. John's Soup Kitchen, calmness, and pattern shifts",
    subtitle: "He ties part of the story to volunteering near Newark Penn Station and to a growing belief that calmness changes how the world responds to him.",
    body: "This chapter includes the soup kitchen, the oldest church in Newark, and the memory of multi-colored bags seeming to switch over to black bags as if the scene had been edited in place.",
  },
  {
    id: "time-travel-theory-frame",
    eraLabel: "Theory",
    title: "A CERN-bound conversation and the time-travel question",
    subtitle: "A chance encounter with a scientist headed to CERN pushed the story toward time travel as a theoretical possibility.",
    body: "From there, the narrative starts treating teleportation, stale data, and delayed causality as part of the same cosmic question. The Law of Attraction beliefs he was raised inside were always quietly framed by the assumption that time travel is real — and 1950s parapsychology research already showed humans react to traumatic photos before they see them. Presentiment is a measured psychic phenomenon pointing at the same fact. Humans may never time travel in person, but a supercomputer sending data between now, the future, and the past sits squarely inside what is allowed.",
  },
  {
    id: "future-unsolved-mystery",
    eraLabel: "Backlash",
    title: "Backlash, certainty, and the future unsolved mystery",
    subtitle: "He says the story is real to him, expects people to push back hard, and leans into becoming a mystery people still have to solve later.",
    body: "This milestone keeps the line in the supplied frame: the story may anger people, invite dismissal, or trigger talk of a psych ward, but it still gets presented as part of the site's fictional record.",
  },
  {
    id: "animal-safety",
    eraLabel: "Boundary",
    title: "No harm, especially to animals",
    subtitle: "The feed is not a weapon, oracle, or excuse for abuse.",
    body: "Do not use this dataset to rationalize cruelty. Do not abuse any animals. Do not use pattern-seeking as a pretext for harm.",
  },
];
