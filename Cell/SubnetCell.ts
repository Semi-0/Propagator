// import { make_relation } from "../DataTypes/Relation";
// import { get_global_parent } from "../Shared/PublicState";
// import { cell_constructor, construct_cell, type Cell } from "./Cell";
// we can use staged scheduler to do this but then we need to make sure propagator in the subnet
// are only belong to the internal scheduler
// but this requires to parse the subnet function 
// then it becomes a big problem

// export const subnet_cell = (name: string, id: string | null = null, subnet_setup: (new_element: Cell<any>, content: Cell<any>, strongest: Cell<any>) => void) => {
//    const relation = make_relation(name, get_global_parent(), id)
//    const staged_scheduler 
   
//     var new_element = construct_cell(name + "_element")
//    var content = construct_cell(name + "_content")
//    var strongest = construct_cell(name + "_strongest")
//    subnet_setup(new_element, content, strongest)
   


// }