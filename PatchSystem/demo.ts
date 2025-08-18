// import {
//     create_patched_cell,
//     ce_write,
//     ce_strategy_extend_memory,
//     ce_strategy_extend_intake,
//     ce_strategy_extend_selection,
//     get_buffer_value,
//     get_strategy_value,
//     get_effective_value,
//     set_cell_caps
// } from "./adapter/simpleAdapter";

// // Demo: Building a smart sensor aggregator
// export function demo_sensor_aggregator() {
//     console.log("=== Patch System Demo: Smart Sensor Aggregator ===\n");

//     // Create a patched cell for sensor data aggregation
//     const sensorCell = create_patched_cell<number>("sensor_aggregator");

//     // Set governance caps
//     set_cell_caps(sensorCell, {
//         memoryMaxN: 10,  // Max 10 items in memory
//         allowReducers: new Set(['sum', 'avg', 'max', 'min'])
//     });

//     console.log("1. Initial state:");
//     console.log("Strategy:", get_strategy_value(sensorCell));
//     console.log("Buffer:", get_buffer_value(sensorCell));
//     console.log();

//     // Configure memory strategy: keep last 5 readings
//     ce_strategy_extend_memory(sensorCell, { kind: 'count', n: 5 });
//     console.log("2. After setting memory strategy (keep last 5):");
//     console.log("Strategy:", get_strategy_value(sensorCell));
//     console.log();

//     // Configure intake strategy: limit each sensor to 3 readings, order by strength
//     ce_strategy_extend_intake(sensorCell, {
//         key: 'source',
//         quota: { 'temp_sensor': 3, 'humidity_sensor': 2, 'pressure_sensor': 1 },
//         order: 'strength'
//     });
//     console.log("3. After setting intake strategy:");
//     console.log("Strategy:", get_strategy_value(sensorCell));
//     console.log();

//     // Configure selection strategy: use average of all readings
//     ce_strategy_extend_selection(sensorCell, {
//         ranks: new Set(['reduce']),
//         reducers: new Set(['avg'])
//     });
//     console.log("4. After setting selection strategy (average):");
//     console.log("Strategy:", get_strategy_value(sensorCell));
//     console.log();

//     // Simulate sensor readings
//     console.log("5. Writing sensor data:");
    
//     // Temperature sensor readings (high strength)
//     ce_write(sensorCell, 25.5, { sourceCellId: "temp_sensor", strength: 0.9 });
//     ce_write(sensorCell, 26.1, { sourceCellId: "temp_sensor", strength: 0.8 });
//     ce_write(sensorCell, 24.8, { sourceCellId: "temp_sensor", strength: 0.7 });
//     ce_write(sensorCell, 27.2, { sourceCellId: "temp_sensor", strength: 0.6 }); // Should replace oldest

//     // Humidity sensor readings (medium strength)
//     ce_write(sensorCell, 65, { sourceCellId: "humidity_sensor", strength: 0.5 });
//     ce_write(sensorCell, 68, { sourceCellId: "humidity_sensor", strength: 0.4 });

//     // Pressure sensor reading (low strength)
//     ce_write(sensorCell, 1013, { sourceCellId: "pressure_sensor", strength: 0.3 });

//     console.log("Buffer contents:");
//     const buffer = get_buffer_value(sensorCell);
//     buffer.forEach((item, index) => {
//         console.log(`  ${index + 1}. ${item.value} (${item.sourceCellId}, strength: ${item.strength})`);
//     });
//     console.log();

//     // Get effective value (average)
//     const effectiveValue = get_effective_value(sensorCell);
//     console.log("6. Effective value (average):", effectiveValue);
//     console.log();

//     // Change selection strategy to use strongest value
//     console.log("7. Changing to strongest selection strategy:");
//     ce_strategy_extend_selection(sensorCell, {
//         ranks: new Set(['strongest']),
//         reducers: new Set()
//     });

//     const newEffectiveValue = get_effective_value(sensorCell);
//     console.log("New effective value (strongest):", newEffectiveValue);
//     console.log();

//     // Show final strategy
//     console.log("8. Final strategy:");
//     console.log(JSON.stringify(get_strategy_value(sensorCell), null, 2));
// }

// // Demo: Real-time data stream processing
// export function demo_stream_processing() {
//     console.log("=== Patch System Demo: Real-time Stream Processing ===\n");

//     const streamCell = create_patched_cell<number>("data_stream");

//     // Configure for real-time processing
//     ce_strategy_extend_memory(streamCell, { kind: 'time', ms: 1000 }); // 1 second window
//     ce_strategy_extend_selection(streamCell, {
//         ranks: new Set(['reduce']),
//         reducers: new Set(['sum'])
//     });

//     console.log("Stream processing setup:");
//     console.log("Strategy:", cell_strongest(ce_strategy(streamCell)));
//     console.log();

//     // Simulate rapid data stream
//     console.log("Simulating data stream...");
//     for (let i = 1; i <= 5; i++) {
//         ce_write(streamCell, i, { sourceCellId: "stream_source", strength: 1.0 });
//         console.log(`  Added ${i}, current sum: ${cell_strongest(ce_effective(streamCell))}`);
//     }

//     console.log("\nFinal buffer:");
//     const buffer = cell_strongest(ce_buffer(streamCell));
//     buffer.forEach((item, index) => {
//         console.log(`  ${index + 1}. ${item.value}`);
//     });
//     console.log("Final sum:", cell_strongest(ce_effective(streamCell)));
// }

// // Demo: Multi-source conflict resolution
// export function demo_conflict_resolution() {
//     console.log("=== Patch System Demo: Multi-source Conflict Resolution ===\n");

//     const conflictCell = create_patched_cell<string>("conflict_resolver");

//     // Configure to select strongest value
//     ce_strategy_extend_selection(conflictCell, {
//         ranks: new Set(['strongest']),
//         reducers: new Set()
//     });

//     console.log("Conflict resolution setup (strongest wins)");
//     console.log();

//     // Simulate conflicting data from multiple sources
//     ce_write(conflictCell, "data_from_sensor_a", { sourceCellId: "sensor_a", strength: 0.3 });
//     ce_write(conflictCell, "data_from_sensor_b", { sourceCellId: "sensor_b", strength: 0.8 });
//     ce_write(conflictCell, "data_from_sensor_c", { sourceCellId: "sensor_c", strength: 0.5 });

//     console.log("Conflicting data sources:");
//     const buffer = cell_strongest(ce_buffer(conflictCell));
//     buffer.forEach((item, index) => {
//         console.log(`  ${index + 1}. ${item.value} (strength: ${item.strength})`);
//     });

//     const resolved = cell_strongest(ce_effective(conflictCell));
//     console.log("\nResolved value (strongest):", resolved);
// }

// // Run all demos
// export function run_all_demos() {
//     demo_sensor_aggregator();
//     console.log("\n" + "=".repeat(60) + "\n");
    
//     demo_stream_processing();
//     console.log("\n" + "=".repeat(60) + "\n");
    
//     demo_conflict_resolution();
// }

// // Export for use in tests or other modules 