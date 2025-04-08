// memory-monitor.ts
export class MemoryMonitor {
    private lastUsage: NodeJS.MemoryUsage;
    private snapshots: Map<string, NodeJS.MemoryUsage>;
    private intervalId?: ReturnType<typeof setInterval>;


    constructor() {
        this.lastUsage = process.memoryUsage();
        this.snapshots = new Map();
    }

    // Take a snapshot at a specific point
    snapshot(label: string) {
        this.snapshots.set(label, process.memoryUsage());
        console.log(`Memory Snapshot [${label}]:`, this.formatMemoryUsage(process.memoryUsage()));
    }

    // Start continuous monitoring
    startMonitoring(intervalMs: number = 5000) {
        this.intervalId = setInterval(() => {
            const currentUsage = process.memoryUsage();
            const diff = this.getUsageDiff(this.lastUsage, currentUsage);
            
            console.log('Memory Usage Change:');
            console.log('Heap Used:', diff.heapUsed);
            console.log('External:', diff.external);
            
            this.lastUsage = currentUsage;
        }, intervalMs);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    // Compare two points
    compareSnapshots(label1: string, label2: string) {
        const snapshot1 = this.snapshots.get(label1);
        const snapshot2 = this.snapshots.get(label2);
        
        if (!snapshot1 || !snapshot2) {
            console.error('Snapshots not found');
            return;
        }

        const diff = this.getUsageDiff(snapshot1, snapshot2);
        console.log(`Memory Difference [${label1} -> ${label2}]:`, 
            this.formatMemoryUsage(diff));
    }

    private getUsageDiff(before: NodeJS.MemoryUsage, after: NodeJS.MemoryUsage) {
        return {
            heapUsed: after.heapUsed - before.heapUsed,
            external: after.external - before.external,
            heapTotal: after.heapTotal - before.heapTotal,
            rss: after.rss - before.rss,
            arrayBuffers: after.arrayBuffers - before.arrayBuffers
        };
    }

    private formatMemoryUsage(usage: NodeJS.MemoryUsage) {
        return {
            heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
            external: `${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`
        };
    }
}