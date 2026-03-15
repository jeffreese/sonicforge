import type { SonicForgeComposition, Note } from "./composition";
import { expandChord } from "../util/music";

/**
 * Walk all notes in a composition and expand chord shorthand pitches
 * (e.g. "Cmaj7" → multiple notes "C4", "E4", "G4", "B4").
 *
 * Mutates the composition in place.
 */
export function expandChords(composition: SonicForgeComposition): void {
  for (const section of composition.sections) {
    for (const track of section.tracks) {
      const expanded: Note[] = [];
      for (const note of track.notes) {
        const notes = expandChord(note.pitch);
        if (notes) {
          // Expand chord into individual notes with the same timing
          for (const pitch of notes) {
            expanded.push({ ...note, pitch });
          }
        } else {
          expanded.push(note);
        }
      }
      track.notes = expanded;
    }
  }
}
