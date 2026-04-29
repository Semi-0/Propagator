




export type Trie = {
    is_end: () => boolean 
    get_child: (key: number) => Trie | undefined,
    iter_children: () => IterableIterator<readonly [number, Trie]>,
    has_edge: (key: number) => boolean,
    add_edge: (key: number, edge: Trie | any) => Trie,
    remove_edge: (key: number) => Trie,
}

export const is_trie = (value: any) => {
    return value.is_end !== undefined && 
    value.get_child !== undefined &&
    value.iter_children !== undefined &&
    value.has_edge !== undefined && 
    value.add_edge !== undefined &&
    value.remove_edge !== undefined
}

export const make_trie = () => {
    var is_end = true
    const children = new Map<number, Trie>()

    const trie_is_end = () => {
        return is_end
    }

    const has_edge = (key: number) => {
        return children.has(key)
    }

    const get_child = (key: number) => {
        return children.get(key)
    }

    const iter_children = function* (): IterableIterator<readonly [number, any]> {
        for (const [key, child] of children.entries()) {
            yield [key, child] as const
        }
    }

    const add_edge = (key: number, edge: Trie | any) => {
        if (is_end) {
            is_end = false
        }
        children.set(key, edge)
    }

    const remove_edge = (key: number) => {
        children.delete(key)
    }

    return {
        is_end: trie_is_end,
        get_child,
        iter_children,
        has_edge,
        add_edge,
        remove_edge,
    }
}

export type TriePatch = {
    path: number[]
    value: any
}

export const is_trie_patch = (value: any) => {
    return value.path !== undefined && value.value !== undefined
}

export const merge_trie_patch = (content: Trie, increment: TriePatch) => {
    const _merge = (path: number[], trie: Trie) => {
        if (path.length === 1) {
            if (trie.has_edge(path[0])) {
                throw new Error("path already exists: " + path.join("."))
            }
            else {
                trie.add_edge(path[0], increment.value)
            }
        }
        else {
            const child = trie.get_child(path[0])
            if (child) {
                _merge(path.slice(1), child)
            }
            else {
                trie.add_edge(path[0], make_trie())
            }
        }
    }
    _merge(increment.path, content)
    return content
}

// in this the patch of a trie 

// might becomes a partial information of path
// and trie might directly merge the sub path