import { cell_strongest, cell_name, cell_content, type Cell } from "@/cell/Cell";
import { to_string } from "generic-handler/built_in_generics/generic_conversation";
import { construct_propagator } from "../Propagator/Propagator";

const inspect_formatter = (name:string) => {
    return "#inspect#" + name 
}

const inspect_propagator = (name:string, inspector: (cell: Cell<any>) => void) => (...cells: Cell<any>[]) => {
    return construct_propagator(cells, [], () => {
        cells.forEach((cell) => {
            inspector(cell)
        })
    }, inspect_formatter(name))
}

/**
 * Creates a logger that collects logs into a string array
 * 
 * @returns An object with a logger function and a getLogs method
 * 
 * @example
 * const stringLogger = create_string_logger();
 * const inspector = inspect_strongest(stringLogger.log);
 * // ... use inspector ...
 * const logs = stringLogger.getLogs(); // Get all collected logs
 */
export function create_string_logger() {
    const logs: string[] = [];
    return {
        log: (message: string) => {
            logs.push(message);
        },
        getLogs: (): string[] => logs,
        getLogsAsString: (separator: string = '\n'): string => logs.join(separator),
        clear: () => {
            logs.length = 0;
        }
    };
}

/**
 * Creates a logger that writes to a file
 * Note: This requires Node.js fs module or Bun's file system APIs
 * 
 * @param filePath - Path to the file to write logs to
 * @param append - Whether to append to the file (default: true)
 * @returns A logger function
 * 
 * @example
 * const fileLogger = create_file_logger('debug.log');
 * const inspector = inspect_strongest(fileLogger);
//  */
// export function create_file_logger(filePath: string, append: boolean = true) {
//     return (message: string) => {
//         try {
//             // Use Bun's file system API if available
//             if (typeof Bun !== 'undefined') {
//                 if (append) {
//                     // Append mode: read existing content, then write with new message
//                     Bun.file(filePath).text()
//                         .then(existing => {
//                             Bun.write(filePath, existing + message + '\n');
//                         })
//                         .catch(() => {
//                             // File doesn't exist yet, create it
//                             Bun.write(filePath, message + '\n');
//                         });
//                 } else {
//                     // Overwrite mode: just write the message
//                     Bun.write(filePath, message + '\n');
//                 }
//             } else if (typeof require !== 'undefined') {
//                 // Node.js fs module
//                 const fs = require('fs');
//                 const content = append && fs.existsSync(filePath) 
//                     ? fs.readFileSync(filePath, 'utf8') 
//                     : '';
//                 fs.writeFileSync(filePath, content + message + '\n', 'utf8');
//             } else {
//                 console.warn('File logging not available in this environment');
//                 console.log(message);
//             }
//         } catch (error) {
//             console.error(`Error writing to file ${filePath}:`, error);
//             console.log(message); // Fallback to console
//         }
//     };
// }

/**
 * Inspects the strongest value of cells
 * 
 * @param logger - Optional logger function (defaults to console.log)
 * @returns A propagator that inspects cell strongest values
 * 
 * @example
 * // Log to console (default)
 * const inspector = inspect_strongest();
 * 
 * // Log to string
 * const stringLogger = create_string_logger();
 * const inspector = inspect_strongest(stringLogger.log);
 * 
 * // Log to file
 * const fileLogger = create_file_logger('debug.log');
 * const inspector = inspect_strongest(fileLogger);
 */
export const inspect_strongest = (logger: (message: string) => void = console.log) => {
    return inspect_propagator("inspect_strongest", (cell: Cell<any>) => {
        logger("cell name:" + cell_name(cell) + " updated");
        logger("cell strongest value:");
        logger(to_string(cell_strongest(cell)));
    });
}

/**
 * Inspects the content of cells
 * 
 * @param logger - Optional logger function (defaults to console.log)
 * @returns A propagator that inspects cell content
 * 
 * @example
 * // Log to console (default)
 * const inspector = inspect_content();
 * 
 * // Log to string
 * const stringLogger = create_string_logger();
 * const inspector = inspect_content(stringLogger.log);
 */
export const inspect_content = (logger: (message: string) => void = console.log) => {
    return inspect_propagator("inspect_content", (cell: Cell<any>) => {
        logger("cell name:" + cell_name(cell) + " updated");
        logger("cell content:");
        logger(to_string(cell_content(cell)));
    });
}

/**
 * Observes cell updates and logs cell summaries
 * 
 * @param print_to - Function to print/log messages (defaults to console.log)
 * @returns A propagator that observes cell updates
 * 
 * @example
 * // Log to console (default)
 * const observer = observe_cell();
 * 
 * // Log to string
 * const stringLogger = create_string_logger();
 * const observer = observe_cell(stringLogger.log);
 */
export function observe_cell(print_to: (str: string) => void = console.log){
    return inspect_propagator("observe_cell", (cell: Cell<any>) => {
        print_to("\n");
        print_to(cell.summarize());
    });
}


