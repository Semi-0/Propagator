export const r_delay = (
    output: Cell<any>,
    arg: Cell<any>,
    initial?: any
) => {
    // Initialize "last" with annotated initial value if provided, or leave undefined.
    let last: LayeredObject | undefined =
        initial !== undefined ? annotate_now(cell_id(output))(initial) : undefined;

    return construct_reactive_propagator((...args: LayeredObject[]) => {
        // Get the newest value from the input cell.
        const curr = get_base_value(args[args.length - 1]);
        // We annotate the current value with the output cell's id (for tracking/timestamp purposes).
        const annotatedCurr = annotate_now(cell_id(output))(curr);

        if (last === undefined) {
            // First update: save the value but do not emit it.
            last = annotatedCurr;
            return no_compute;
        } else {
            // On subsequent updates, output the stored previous value,
            // and then update "last" with the current annotated value.
            const ret = last;
            last = annotatedCurr;
            return ret;
        }
    }, "delay")(arg, output);
} 