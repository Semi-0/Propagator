import { v4 as uuidv4 } from 'uuid';

export type InterestedType = Relation;

interface Relation{
    add_child(child: InterestedType): void
    get_id(): string
    get_name(): string
    set_name(name: string): void
    get_children(): Relation[]
    set_level(level: number): void
    get_level(): number
    dispose(): void
}





export class Primitive_Relation implements Relation {
    name: string;
    uuid: string;
    level: number = 0;
    parent: Relation | null;
    children: Relation[] = [];

    constructor(name: string, parent: Relation | null, uuid: string | null = null){
        this.name = name;
        this.parent = parent;

        if (parent === null){
            this.level = 0;
        }
        else{
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
        this.children.push(child);
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
        return this.children;
    }

    dispose(){
        this.children = [];
    }
}

export function is_relation(obj: any): obj is Relation{
    return obj instanceof Primitive_Relation;
}

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