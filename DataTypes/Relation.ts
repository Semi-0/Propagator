// @ts-nocheck
import { v4 as uuidv4 } from 'uuid';
import { type Cell } from '../Cell/Cell';
import { type Propagator } from '../Propagator/Propagator';
import { type Relation } from './Relation';

export type InterestedType = Cell | Propagator | Relation;

export class Relation{
    name: string;
    uuid: string;
    parent: InterestedType;
    children: InterestedType[] = [];

    constructor(name: string, parent: InterestedType){
        this.name = name;
        this.parent = parent;
        this.uuid = uuidv4(); 
    }

    add_child(child: InterestedType){
        this.children.push(child);
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