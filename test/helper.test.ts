// // ... existing imports ...
// import { expect, test } from "bun:test";
// import { construct_better_set, to_array, type BetterSet } from "generic-handler/built_in_generics/generic_better_set";
// import { make_multi_dimensional_set } from "generic-handler/built_in_generics/generic_better_set";
// import { inspect } from "util";
// // ... existing tests ...
// // Helper function to create a multi-dimensional BetterSet

// const set1 = make_multi_dimensional_set([
//     ["a", "b"],
//     ["c", "d"],
//     ["e", ["f", "g"]]
// ]);

// const set2 = make_multi_dimensional_set([
//     ["h", "i"],
//     ["j", ["k", "l"]]
// ]);

// console.log(inspect(set1, {showHidden: true, depth: 100}))

// test("flat_map on multi-dimensional BetterSet", () => {
//     const flatMapped = flat_map((item: any) => item, set1);
//     expect(to_array(flatMapped)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
// });

// test("map on multi-dimensional BetterSet", () => {
//     const mapped = map((item: any) => {
//         if (typeof item === 'string') return item;
//         return to_array(item).join('-');
//     }, set1);
//     expect(to_array(mapped)).toEqual(["a-b", "c-d", "e-f-g"]);
// });

// test("union of multi-dimensional BetterSets", () => {
//     const unionSet = union(set1, set2);
//     expect(to_array(unionSet).map(item => 
//         typeof item === 'string' ? item : to_array(item)
//     )).toEqual([
//         ["a", "b"],
//         ["c", "d"],
//         ["e", ["f", "g"]],
//         ["h", "i"],
//         ["j", ["k", "l"]]
//     ]);
// });

// test("reduce_right on multi-dimensional BetterSet", () => {
//     const reduced = reduce_right(
//         (acc: string, value: any) => 
//             acc + (Array.isArray(value) ? value.join('') : value),
//         set1,
//         ""
//     );
//     expect(to_array(reduced)[0]).toBe("efgcdab");
// });