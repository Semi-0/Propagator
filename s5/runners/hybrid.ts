import { beginEpisode, commit, endEpisode, setGlobalEventCapture, getLogger } from '../lab/episodes.js';
import { set_scheduler, execute_all_tasks_sequential, reset_scheduler } from '../../Shared/Scheduler/Scheduler.js';
import { make_informativeness_scheduler } from '../../Shared/Scheduler/InformativenessScheduler.js';

export async function runHybrid(
	seed: number,
	execute: () => Promise<void> | void
): Promise<void> {
	beginEpisode(seed);
	
	// Set up global event capture to record FIRE/JOIN events from the main system
	setGlobalEventCapture((event) => {
		getLogger().addEvent(event);
	});
	
	set_scheduler(make_informativeness_scheduler()); // Use the informativeness scheduler
	await execute();
	execute_all_tasks_sequential((e) => { console.error("Error in hybrid runner:", e); });
	commit();
	endEpisode();
	reset_scheduler(); // Reset to default scheduler after run
	
	// Clean up
	setGlobalEventCapture(null);
}
