import { beginEpisode, commit, endEpisode, setGlobalEventCapture, getLogger } from '../lab/episodes.js';

// This runner does not translate S5 Graph → legacy graph. Instead, it wraps
// an arbitrary execution thunk that uses your existing Propagator/Scheduler
// system and ensures BEGIN→...→COMMIT→END logging boundaries.
// You can instrument FIRE/JOIN by adding hooks in your Propagator writes.

export async function runContextual(
	seed: number,
	execute: () => Promise<void> | void
): Promise<void> {
	beginEpisode(seed);
	
	// Set up global event capture to record FIRE/JOIN events from the main system
	setGlobalEventCapture((event) => {
		getLogger().addEvent(event);
	});
	
	await execute();
	// Effect boundary: only after quiescence (call after your scheduler drains)
	commit();
	endEpisode();
	
	// Clean up
	setGlobalEventCapture(null);
}
