import { expect, test, jest } from "bun:test"; 

import { Cell, cell_strongest_base_value, cell_strongest_value } from "../Cell/Cell";
import { c_multiply } from "../BuiltInProps";
import { tell } from "../ui";
import { get_base_value } from "../Cell/CellValue";

test("c_multiply", () => {
    const x = new Cell("x");
    const y = new Cell("y");
    const product = new Cell("product");
    
    c_multiply(x, y, product);



    tell(x, 8, "fst");


    tell(product, 40, "fst");

    
   
    expect(cell_strongest_base_value(y)).toBe(5);
})