import { v4 as uuidv4 } from 'uuid';

export type InterestedType = Relation;

export class Relation{
    name: string;
    uuid: string;
    level: number = 0;
    parent: Relation | null;
    children: Relation[] = [];

    constructor(name: string, parent: Relation |  null ){
        this.name = name;
        this.parent = parent;

        if (parent === null){
            this.level = 0;
        }
        else{
            this.level = parent.level  + 1;
        }
        
        this.uuid = uuidv4(); 
    }

    add_child(child: InterestedType){
        this.children.push(child);
        return this;
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

    clear_children(){
        this.children = [];
    }
}

export function is_relation(obj: any): obj is Relation{
    return obj instanceof Relation;
}

export function make_relation(name: string, parent: InterestedType){
    return new Relation(name, parent);
}