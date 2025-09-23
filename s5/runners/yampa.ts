import { beginEpisode, commit, endEpisode, setGlobalEventCapture, getLogger } from '../lab/episodes.js';
import { set_scheduler, execute_all_tasks_sequential, reset_scheduler, Current_Scheduler } from '../../Shared/Scheduler/Scheduler.js';
import { simple_scheduler } from '../../Shared/Scheduler/SimpleScheduler.js';

export async function runYampa(
	seed: number,
	execute: () => Promise<void> | void
): Promise<void> {
	beginEpisode(seed);
	
	// Set up global event capture to record FIRE/JOIN events from the main system
	setGlobalEventCapture((event) => {
		getLogger().addEvent(event);
	});
	
	// Apply patches (execute function)
	await execute();
	
	// Yampa-style: inner fixpoint loop until quiescence
	// Use simple scheduler for the inner loop
	set_scheduler(simple_scheduler());
	
	// Run to quiescence (no more propagators can fire)
	let iterations = 0;
	const maxIterations = 1000; // Safety limit
	
	while (iterations < maxIterations) {
		const queueSize = Current_Scheduler.summarize().split('\n').filter((line: string) => line.trim()).length;
		
		if (queueSize === 0) {
			// No propagators in queue, we've reached quiescence
			break;
		}
		
		// Execute one round of propagators
		execute_all_tasks_sequential((e) => { 
			console.error("Error in Yampa inner loop:", e); 
		});
		
		iterations++;
	}
	
	if (iterations >= maxIterations) {
		console.warn("Yampa runner reached max iterations, may not have converged");
	}
	
	// Effect boundary: commit only after quiescence
	commit();
	endEpisode();
	reset_scheduler();
	
	// Clean up
	setGlobalEventCapture(null);
}
