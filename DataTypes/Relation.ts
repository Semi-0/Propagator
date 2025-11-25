import { v4 as uuidv4 } from 'uuid';
import { match_args, register_predicate } from 'generic-handler/Predicates';
import { define_generic_procedure_handler } from 'generic-handler/GenericProcedure';
import { get_children } from '../Shared/Generics';

export type InterestedType = Relation;

export interface Relation{
    add_child(child: InterestedType): void
    get_id(): string
    get_name(): string
    set_name(name: string): void
    get_children(): Relation[]
    set_level(level: number): void
    get_level(): number
    dispose(): void
    parent: WeakRef<Relation> | null
}





export class Primitive_Relation implements Relation {
    name: string;
    uuid: string;
    level: number = 0;
    parent: WeakRef<Relation> | null;
    children: WeakRef<Relation>[] = [];

    constructor(name: string, parent: Relation | null, uuid: string | null = null){
        this.name = name;
        this.parent = parent ? new WeakRef(parent) : null;

        if (parent === null){
            
            this.level = 0;
        }
        else{
            parent.add_child(this);
            this.level = parent.get_level()  + 1;
        }
        
        if (uuid === null){
            this.uuid = uuidv4(); 
        }   
        else{
            // @ts-ignore
            this.uuid = uuid
        }
    }

    add_child(child: InterestedType){
        this.children.push(new WeakRef(child));
        return this;
    }

    set_level(level: number): void {
        this.level = level
    }

    get_level(): number{
        return this.level
    }

    get_id(){
        return this.uuid;
    }

    get_name(){
        return this.name;
    }

    set_name(name: string){
       this.name = name;
    }

    get_children(){
        // Filter out garbage collected children and return strong references
        const validChildren: Relation[] = [];
        const newChildren: WeakRef<Relation>[] = [];
        
        for (const childRef of this.children) {
            const child = childRef.deref();
            if (child) {
                validChildren.push(child);
                newChildren.push(childRef);
            }
        }
        
        // Clean up the children array by removing dead references
        // This is a lazy cleanup strategy
        if (newChildren.length < this.children.length) {
            this.children = newChildren;
        }
        
        return validChildren;
    }

    dispose(){
        this.children = [];
    }
}

export const is_relation = register_predicate("is_relation", (obj: any): obj is Relation => {
    return obj !== undefined && obj !== null && 'get_id' in obj && 'get_name' in obj && 'get_children' in obj && 'dispose' in obj;
});




export function make_relation(name: string, parent: InterestedType, id: string | null = null){
    // TODO: Proper management of parential relationship for memory leak

// export const p_switch = (condition: Cell<boolean>, value: Cell<any>, output: Cell<any>) => primitive_propagator((condition: boolean, value: any) => {
//     if (base_equal(condition, true)){
//         return value;
//     }
//     else{
//         return no_compute
//     }
// }, "switcher")(condition, value, output);
    return new Primitive_Relation(name, parent, id);
}