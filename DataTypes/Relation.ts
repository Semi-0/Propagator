// @ts-nocheck
import { v4 as uuidv4 } from 'uuid';

export class Relation{
    name: string;
    uuid: string;
    parent: any;
    children: any[] = [];

    constructor(name: string, parent: any){
        this.name = name;
        this.parent = parent;
        this.uuid = uuidv4(); 
    }

    addChild(child: any){
        this.children.push(child);
    }

    getID(){
        return this.uuid;
    }

    getName(){
        return this.name;
    }

    setName(name: string){
       this.name = name;
    }

    getChildren(){
        return this.children;
    }

    clear_children(){
        this.children = [];
    }
}

export function is_relation(obj: any): obj is Relation{
    return obj instanceof Relation;
}

export function make_relation(name: string, parent: any){
    return new Relation(name, parent);
}