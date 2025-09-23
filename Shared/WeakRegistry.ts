export class WeakRegistry<T> {
    private readonly idOf: (obj: T) => string;
    private readonly refs: Map<string, WeakRef<T>> = new Map();
    private readonly finalizer: FinalizationRegistry<string>;

    constructor(idOf: (obj: T) => string) {
        this.idOf = idOf;
        this.finalizer = new FinalizationRegistry<string>((id) => {
            this.refs.delete(id);
        });
    }

    add(obj: T): void {
        const id = this.idOf(obj);
        this.refs.set(id, new WeakRef(obj));
        this.finalizer.register(obj as any, id);
    }

    removeById(id: string): void {
        this.refs.delete(id);
    }

    getById(id: string): T | undefined {
        const ref = this.refs.get(id);
        const obj = ref?.deref();
        if (!obj) {
            this.refs.delete(id);
        }
        return obj;
    }

    values(): T[] {
        const out: T[] = [];
        for (const [id, ref] of this.refs) {
            const obj = ref.deref();
            if (obj) {
                out.push(obj);
            } else {
                this.refs.delete(id);
            }
        }
        return out;
    }

    prune(): void {
        // Force a pass to drop cleared refs
        for (const [id, ref] of this.refs) {
            if (!ref.deref()) {
                this.refs.delete(id);
            }
        }
    }
}

