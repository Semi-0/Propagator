import { expect, test, jest , describe} from "bun:test";

import { construct_node } from "../Shared/Reactivity/MiniReactor/MrPrimitive";
import { connect, disconnect, combine, stepper, dispose, type Stepper } from "../Shared/Reactivity/MiniReactor/MrPrimitiveCombinators";
import { subscribe } from "../Shared/Reactivity/MiniReactor/MrCombinators";


describe("miniReactor", () => {
    test("should able to successfully send value to observer", () => {
        const A = construct_node();

        const B = construct_node();
        connect(A, B, (notify, update) => {
            notify(update);
        })

        const observer = jest.fn();
        subscribe(observer)(B);

        A.receive(1);
        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(1);
    })

    test("multiple node should able to successfully send value to observer", () => {
        const A = construct_node();
        const B = construct_node();
        const C = construct_node();

        connect(A, B, (notify, update) => {
            notify(update);
        })

        connect(B, C, (notify, update) => {
            notify(update);
        })

        const observer = jest.fn();
        subscribe(observer)(C);

        A.receive(1);
        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(1);
    })


    test("disconnect should remove edge", () => {
        const A = construct_node();
        const B = construct_node();
        const C = construct_node();

        connect(A, B, (notify, update) => {
            notify(update);
        })

        connect(B, C, (notify, update) => {
            notify(update);
        })

        const observer = jest.fn();
        subscribe(observer)(C);

        A.receive(1);
        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(1);

        observer.mockClear();

        disconnect(B, C);

        A.receive(2);
        expect(observer).toHaveBeenCalledTimes(0);
    })

    test("should handle multiple observers", () => {
        const A = construct_node();
        const B = construct_node();
        const C = construct_node();

        connect(A, B, (notify, update) => {
            notify(update);
        });

        connect(B, C, (notify, update) => {
            notify(update);
        });

        const observer1 = jest.fn();
        const observer2 = jest.fn();
        subscribe(observer1)(C);
        subscribe(observer2)(C);

        A.receive(1);
        expect(observer1).toHaveBeenCalledTimes(1);
        expect(observer1).toHaveBeenCalledWith(1);
        expect(observer2).toHaveBeenCalledTimes(1);
        expect(observer2).toHaveBeenCalledWith(1);
    });

    test("should propagate updates through multiple connections", () => {
        const A = construct_node();
        const B = construct_node();
        const C = construct_node();
        const D = construct_node();

        connect(A, B, (notify, update) => {
            notify(update);
        });

        connect(B, C, (notify, update) => {
            notify(update);
        });

        connect(C, D, (notify, update) => {
            notify(update);
        });

        const observer = jest.fn();
        subscribe(observer)(D);

        A.receive(1);
        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(1);
    });
})



describe("miniReactor Combinators", () => {
    test("combine should combine multiple nodes", () => {
        const A = construct_node<number>();
        const B = construct_node<number>();
        const combined = combine((notify, update, sources) => {
            const combinedValue = sources.filter((a) => a !== undefined).reduce((acc, source: Stepper<number>) => acc + source.get_value(), 0);
            sources.forEach((source) => {
                console.log(source.node.id + " " + source.get_value());
            })
            // console.log(combinedValue);
            notify(combinedValue);
        }, [0, 0])(A, B);

        const observer = jest.fn();
        subscribe(observer)(combined);

        A.receive(1);
        B.receive(2);

        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenCalledWith(1); // First call with A's value
        expect(observer).toHaveBeenCalledWith(3); // Second call with A + B's value
    });

    test("stepper should create a stepper node", () => {
        const A = construct_node<number>();
        const stepperNode = stepper(0)(A);

        const observer = jest.fn();
        subscribe(observer)(stepperNode.node);

        A.receive(1);
        A.receive(2);

        expect(observer).toHaveBeenCalledTimes(2);
        expect(observer).toHaveBeenCalledWith(1); // First step
        expect(observer).toHaveBeenCalledWith(2); // Second step
    });

    test("dispose should recursively dispose nodes", () => {
        const A = construct_node<number>();
        const B = construct_node<number>();
        const C = construct_node<number>();

        connect(A, B, (notify, update) => {
            notify(update);
        });

        connect(B, C, (notify, update) => {
            notify(update);
        });

        const observer = jest.fn();
        subscribe(observer)(C);

        A.receive(1);
        expect(observer).toHaveBeenCalledTimes(1);
        expect(observer).toHaveBeenCalledWith(1);

        dispose(B);

        observer.mockClear();

        A.receive(2);
        expect(observer).toHaveBeenCalledTimes(0); // C should not receive updates after B is disposed
    });
});