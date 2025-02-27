import { construct_better_set } from "generic-handler/built_in_generics/generic_better_set"
import type { BetterSet } from "generic-handler/built_in_generics/generic_better_set"


export const set_copy = (set: BetterSet<any>) => {
    return construct_better_set([...set.meta_data.values()], set.identify_by)
}

export const set_copy_with_new_identify_by = (set: BetterSet<any>, new_identify_by: (a: any) => string) => {
    return construct_better_set([...set.meta_data.values()], new_identify_by)
}
