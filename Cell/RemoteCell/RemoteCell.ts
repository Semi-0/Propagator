// import { make_relation } from "../../DataTypes/Relation";
// import {  get_global_parent, PublicStateCommand, set_global_state } from "../../Shared/PublicState";
// import { scheduled_reactive_state } from "../../Shared/Scheduler/Scheduler";
// import { the_contradiction, the_nothing } from "../CellValue";
// import { pipe } from "fp-ts/lib/function";
// import { general_contradiction, type Cell } from "../Cell";
// import { handle_contradiction } from "../Cell";
// import { option, strong } from "fp-ts";
// import { cell_merge } from "../Merge";
// import type { Propagator } from "../../Propagator/Propagator";
// import { describe } from "../../Helper/UI";
// import { to_string } from "generic-handler/built_in_generics/generic_conversation";
// import { mark_error } from "sando-layer/Specified/ErrorLayer"
// import SuperJSON from "superjson";

// import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-handler/GenericProcedure";
// import type { RemoteConnector } from "../../RemoteServer/RemoteConnector";
// import * as E from "fp-ts/lib/Either"
// import { match_args } from "generic-handler/Predicates";
// import { is_layered_object } from "../../Helper/Predicate";
// import { to_string } from "generic-handler/built_in_generics/generic_conversation";
// import { is_better_set } from "generic-handler/built_in_generics/generic_better_set";

// // Initialize the BetterSet serialization support
// export const parse_remote_data = construct_simple_generic_procedure("parse_socket_data", 1, (data: any) => {
//     try {
//         // If plain JSON parsing fails, try with SuperJSON
//         const parsed = SuperJSON.parse(data.toString());
//         return parsed;
//         } catch (superJsonError) {
//             // If both fail, return the data as is (might be a primitive value)
//             console.warn("Failed to parse data using JSON and SuperJSON, using raw value");
//             return data.toString();
//         }
//     }
// )

// export const encode_remote_data = construct_simple_generic_procedure("encode_socket_data", 1, (data: any) => {
//     return SuperJSON.stringify(data);
// })

// define_generic_procedure_handler(encode_remote_data, match_args(is_layered_object),
//     (data: any) => {
//         return SuperJSON.stringify(data.describe_self());
//     }
// )

// // Add special handler for BetterSet objects
// define_generic_procedure_handler(encode_remote_data, match_args(is_better_set),
//     (data: any) => {
//         return SuperJSON.stringify(data);
//     }
// )

// export const closed = "closed"

// export async function remote_cell(name: string, remote_server: RemoteConnector){
//     const relation = make_relation(name, get_global_parent())
//     const strongest = scheduled_reactive_state(the_nothing);
//     const content = scheduled_reactive_state(the_nothing);
//     const neighbors: Map<string, Propagator> = new Map();

//     await remote_server.connect()

//     remote_server.events.subscribe((data: any) => {
//         E.match(
//             // onLeft
//             (error: Error) => {
//                 if (error.message === closed){
//                     strongest.next("closed")
//                 }else{
//                     strongest.next(mark_error(the_contradiction, error))
//                 }
//             },
//             // onRight
//             (data: any) => {
//                 try {
//                     const decodedData = parse_remote_data(data);
//                     strongest.next(decodedData);
//                 } catch (error) {
//                     console.error("Error parsing remote data:", error);
//                     strongest.next(mark_error(the_contradiction, error));
//                 }
//             }
//         )(data)
//     })


//     const cell: Cell<any> = {
//         getRelation: () => relation,
//         getContent: () => content,
//         getStrongest: () => strongest,
//         getNeighbors: () => neighbors,
//         addNeighbor: (propagator: Propagator) => {
//             neighbors.set(propagator.getRelation().get_id(), propagator);
//         }, 
 
//         summarize: () => {
//             const name = relation.get_name();
//             const strongestValue = strongest.get_value();
//             const contentValue = content.get_value();
//             return `name: ${name}\nstrongest: ${describe(strongestValue)}\ncontent: ${describe(contentValue)}`;
//         },
//         addContent: (increment: any) => {
//             try {
//                 remote_server.send(encode_remote_data(increment));
//             } catch (error) {
//                 console.error("Error encoding data for remote server:", error);
//             }
//         },
//         force_update: () => {
//             remote_server.send(encode_remote_data(strongest.get_value()))
//         }, 
//         observe_update: (observer: (cellValues: any) => void) => {
//             strongest.subscribe(observer);
//         },
//         dispose: () => {
//             strongest.dispose();
//             content.dispose();
//             remote_server.dispose()
//         }
//     }


//     set_global_state(PublicStateCommand.ADD_CELL, cell);
//     set_global_state(PublicStateCommand.ADD_CHILD, relation);

//     strongest.subscribe((v: any) => {
//         if (general_contradiction(v)){
//           handle_contradiction(cell)
//         }
//     })    

//     return cell;
// }
