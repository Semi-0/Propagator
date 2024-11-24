import { expect, test, jest , describe} from "bun:test";

import { construct_node } from "../Shared/Reactivity/MiniReactor/MrPrimitive";
import { connect, disconnect } from "../Shared/Reactivity/MiniReactor/MrPrimitiveCombinators";
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
})