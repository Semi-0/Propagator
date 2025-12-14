# Carried Cell Specification

## Overview

A **carried cell** is a reactive cell that is embedded within a data structure (typically a Map or dictionary). The data structure acts as a "carrier" that holds cells as values, enabling reactive propagation through structured data. This system provides a way to create reactive data structures where individual elements can be cells that propagate changes bidirectionally.

## Core Concepts

### Carried Map

A **carried map** is a Map data structure where values can be cells. When merging two carried maps:
- If both the existing value and the new value are cells, they are bidirectionally synchronized (`bi_sync`)
- Otherwise, the value is simply set in the map

**Pseudo Scheme:**
```scheme
(define (merge-carried-map content increment)
  (for-each (lambda (key-value-pair)
              (let ((key (car key-value-pair))
                    (value (cdr key-value-pair)))
                (let ((existing (map-get content key)))
                  (if (and (is-cell? existing) (is-cell? value))
                      (bi-sync existing value)
                      (map-set! content key value)))))
            increment)
  content)
```

### Cell Carrier

A **cell carrier** is a Map that associates string keys with cells. It allows cells to be organized and accessed by name within a reactive context.

**Pseudo Scheme:**
```scheme
(define (make-map-carrier identificator . cells)
  (let ((cell-map (make-hash-table)))
    (for-each (lambda (cell)
                (hash-table-set! cell-map 
                                 (identificator cell) 
                                 cell))
              cells)
    cell-map))
```

## Construction Operations

### Struct Carrier

A struct carrier creates a carrier from a record/struct mapping string keys to cells.

**Pseudo Scheme:**
```scheme
(define (p-construct-struct-carrier struct)
  (lambda (output)
    (let ((struct-entries (record->entries struct))
          (cells (map cdr struct-entries)))
      (let ((find-key-for-cell 
             (lambda (cell)
               (let ((entry (find (lambda (e) 
                                    (same-cell? cell (cdr e)))
                                  struct-entries)))
                 (if entry (car entry) "")))))
        ((p-construct-cell-carrier find-key-for-cell) 
         (append cells (list output)))))))

(define (ce-struct struct)
  (let ((output (construct-cell "struct")))
    ((p-construct-struct-carrier struct) output)
    output))
```

### Dictionary Carrier

A dictionary carrier directly constructs a carrier from a Map of string keys to cells.

**Pseudo Scheme:**
```scheme
(define (p-construct-dict-carrier dict output)
  (p-constant (make-map-from-dict dict) 
              (construct-cell "Nothing") 
              output))

(define (ce-dict dict)
  (let ((output (construct-cell "dict")))
    (p-construct-dict-carrier dict output)
    output))
```

## List Operations

### Cons, Car, Cdr

Lists are represented as maps with "head" and "tail" keys, following the Lisp cons cell model.

**Pseudo Scheme:**
```scheme
(define (p-cons head tail output)
  (compound-propagator
   '()
   (list output)
   (lambda ()
     (p-struct (make-record "head" head "tail" tail) output))
   "p-cons"))

(define (p-car pair accessor)
  (compound-propagator
   (list pair)
   (list accessor)
   (lambda ()
     (c-dict-accessor "head" pair accessor))
   "p-car"))

(define (p-cdr pair accessor)
  (compound-propagator
   (list pair)
   (list accessor)
   (lambda ()
     (c-dict-accessor "tail" pair accessor))
   "p-cdr"))
```

### List Construction

Creates a linked list from an array of cells.

**Pseudo Scheme:**
```scheme
(define (p-list cell-list output)
  (compound-propagator
   '()
   (list output)
   (lambda ()
     (if (= (length cell-list) 1)
         (p-cons (car cell-list) 
                 (construct-cell "end") 
                 output)
         (let ((next (construct-cell "next")))
           (p-list (cdr cell-list) next)
           (p-cons (car cell-list) next output))))
   "p-list"))

(define (ce-list cell-list)
  (let ((output (construct-cell "list")))
    (p-list cell-list output)
    output))
```

### List Map

Applies a mapper function to each element of a list, producing a new list.

**Pseudo Scheme:**
```scheme
(define (p-list-map mapper list output)
  (compound-propagator
   (list list)
   (list output)
   (lambda ()
     (let ((next (construct-cell "next")))
       (p-list-map mapper (ce-cdr list) next)
       (p-cons (mapper (ce-car list)) next output)))
   "p-list-map"))
```

### List Filter

Filters a list based on a predicate function.

**Pseudo Scheme:**
```scheme
(define (p-list-filter predicate list output)
  (compound-propagator
   (list list)
   (list output)
   (lambda ()
     (let ((internal (lambda (cell)
                       (ce-switch (predicate cell) cell))))
       (p-list-map internal list output)))
   "p-list-filter"))
```

### List Zip

Combines two lists element-wise using a combine function.

**Pseudo Scheme:**
```scheme
(define (p-zip combine)
  (lambda (list-A list-B output)
    (compound-propagator
     (list list-A list-B)
     (list output)
     (lambda ()
       (let ((current (ce-cons (ce-car list-A) 
                               (ce-car list-B)))
             (next (construct-cell "next")))
         (combine (ce-cdr list-A) 
                  (ce-cdr list-B) 
                  next)
         (p-cons current next output)))
     "p-list-zip")))

(define p-list-zip (p-zip p-cons))
(define p-dict-zip (p-zip p-dict-pair))
```

### List Combine

Appends two lists together.

**Pseudo Scheme:**
```scheme
(define (p-combine-list list-A list-B output)
  (compound-propagator
   (list list-A list-B)
   (list output)
   (lambda ()
     (let ((copied (ce-copy-list list-A)))
       (let ((internal 
              (lambda (A B)
                (compound-propagator
                 (list A B)
                 (list output)
                 (lambda ()
                   (let ((is-end (ce-is-atom (ce-cdr A))))
                     (p-constant B 
                                 (construct-cell "Nothing") 
                                 (ce-switch is-end (ce-cdr A)))
                     (internal (ce-cdr A) B)))
                 "p-combine-list-internal"))))
         (internal copied list-B))))
   "p-combine-list"))
```

### Linked List to Array

Converts a linked list representation to an array of cells.

**Pseudo Scheme:**
```scheme
(define (p-linked-list-to-array linked-list array)
  (compound-propagator
   (list linked-list)
   (list array)
   (lambda ()
     (let ((internal 
            (lambda (index lst)
              (compound-propagator
               (list lst)
               (list array)
               (lambda ()
                 (let ((current (ce-car lst)))
                   (p-set-array current index array)
                   (internal (ce-add index (ce-constant 1)) 
                            (ce-cdr lst))))
               "linked-list-to-array-internal"))))
       (internal (ce-constant 0) linked-list)))
   "linked-list-to-array"))
```

## Dictionary Operations

### Dictionary Pair

Creates a single key-value pair as a dictionary.

**Pseudo Scheme:**
```scheme
(define (p-dict-pair key value)
  (function-to-primitive-propagator
   "dict-element"
   (lambda (key value)
     (make-map (list (cons key value))))))
```

### Dictionary Accessor

Provides read/write access to a dictionary value by key. This is a **static accessor** - the key must be known at construction time.

**Pseudo Scheme:**
```scheme
(define (c-dict-accessor key)
  (lambda (container accessor)
    (compound-propagator
     (list container)
     (list accessor)
     (lambda ()
       (p-constant (make-dict-with-key (list (cons key accessor)))
                   (construct-cell "Nothing")
                   container))
     "c-map-accessor")))

(define (ce-dict-accessor key)
  (lambda (container)
    (let ((accessor (construct-cell (string-append "map-accessor-" key))))
      ((c-dict-accessor key) container accessor)
      accessor)))
```

### Recursive Accessor

Provides access to nested dictionaries through a path of keys.

**Pseudo Scheme:**
```scheme
(define (recursive-accessor keys)
  (lambda (container accessor)
    (compound-propagator
     (list container)
     (list accessor)
     (lambda ()
       (cond
        ((null? keys) 
         ;; Empty path - identity
         )
        ((= (length keys) 1)
         ((c-dict-accessor (car keys)) container accessor))
        (else
         (let ((middle (construct-cell "middle")))
           ((c-dict-accessor (car keys)) container middle)
           ((recursive-accessor (cdr keys)) middle accessor))))
     "recursive-accessor"))))
```

## Association List Operations

### Pair Lookup

Looks up a value in an association list (list of key-value pairs) by key.

**Pseudo Scheme:**
```scheme
(define (p-pair-lookup key paired-list output)
  (compound-propagator
   (list key paired-list)
   (list output)
   (lambda ()
     (let ((internal 
            (lambda (pair)
              (ce-switch (ce-equal (ce-car pair) key)
                        (ce-cdr pair)))))
       (p-list-map internal paired-list output)))
   "p-lookup"))
```

### Assv (Association Set)

Adds or updates a key-value pair in an association list.

**Pseudo Scheme:**
```scheme
(define (p-assv key value paired-list output)
  (compound-propagator
   (list key value paired-list)
   (list output)
   (lambda ()
     (p-cons (ce-cons key value) paired-list output))
   "p-assv"))
```

## Higher-Order Operations

### Bi-Switcher

A bidirectional switch that routes values between two cells based on a condition. When the condition is true, values flow from `a` to `b` and vice versa.

**Pseudo Scheme:**
```scheme
(define (bi-switcher condition a b)
  (compound-propagator
   (list condition a b)
   (list a b)
   (lambda ()
     (p-switch condition a b)
     (p-switch condition b a))
   "bi-switcher"))
```

### Carrier Map

Maps a function over a carrier map, applying a propagator constructor to each cell in the input map and producing a new carrier map.

**Pseudo Scheme:**
```scheme
(define (carrier-map closure-cell input output)
  (let ((built (make-hash-table)))
    (primitive-propagator
     (lambda (closure-fn input-map)
       (let ((diffed (diff-map built input-map)))
         (for-each (lambda (key-value-pair)
                     (let ((key (car key-value-pair))
                           (input-cell (cdr key-value-pair)))
                       (let ((out-cell (construct-cell key)))
                         (closure-fn input-cell out-cell)
                         (hash-table-set! built key out-cell))))
                   diffed)
         built))
     "carrier-map")
     closure-cell input output)))
```

## Utility Functions

### Diff Map

Computes the difference between two maps, returning entries that exist in the second but not in the first.

**Pseudo Scheme:**
```scheme
(define (diff-map a b)
  (let ((diff (make-hash-table)))
    (for-each (lambda (key-value-pair)
                (let ((key (car key-value-pair)))
                  (if (not (hash-table-exists? a key))
                      (hash-table-set! diff 
                                       key 
                                       (cdr key-value-pair)))))
              b)
    diff))
```

### Is Atom

Determines if a value is an atom (not a map).

**Pseudo Scheme:**
```scheme
(define (is-atom x)
  (not (is-map? x)))

(define (p-is-atom)
  (function-to-primitive-propagator
   "p-is-atom"
   (log-tracer "is-atom" is-atom)))
```

## Design Notes and Limitations

### Known Issues

1. **Dynamic Key Changes**: If dictionary keys change dynamically, the system only extends the dictionary rather than replacing it. This requires a patch-based approach for proper handling.

2. **Static Accessors**: Dictionary accessors are static (keys must be known at construction time). Dynamic accessors would require contextual information to track which environment a value comes from.

3. **Subscription Management**: The current design has scalability issues with subscription cleanup. Using `bi-switcher` for stop subscription handling can lead to unnecessary relationships never being removed.

4. **Retraction**: The design is intended to support retractable carried cells, but this is not yet implemented.

### Future Improvements

- Generalize vector clocks for both supported values and reactive values, with carried cells as a special case of vector clock merge
- Support for dynamic dictionary accessors with contextual information
- Better subscription management and cleanup
- Patch-based dictionary updates for key changes
- Nested map carrier generalization
- Virtual propagator support for more efficient operations

## Type Signatures (Pseudo Scheme)

```scheme
;; Core Types
Cell :: Type
Propagator :: Type
Map :: Type -> Type -> Type

;; Construction
p-construct-cell-carrier :: (Cell -> String) -> [Cell] -> Propagator
p-construct-struct-carrier :: Record String Cell -> Cell (Map String Cell) -> Propagator
p-construct-dict-carrier :: Map String Cell -> Cell (Map String Any) -> Propagator

;; List Operations
p-cons :: Cell Any -> Cell Any -> Cell (Map String Any) -> Propagator
p-car :: Cell (Map String Any) -> Cell Any -> Propagator
p-cdr :: Cell (Map String Any) -> Cell Any -> Propagator
p-list :: [Cell Any] -> Cell (Map String Any) -> Propagator
p-list-map :: (Cell Any -> Cell Any) -> Cell (Map String Any) -> Cell (Map String Any) -> Propagator
p-list-filter :: (Cell Any -> Cell Boolean) -> Cell (Map String Any) -> Cell (Map String Any) -> Propagator
p-list-zip :: Cell (Map String Any) -> Cell (Map String Any) -> Cell (Map String Any) -> Propagator

;; Dictionary Operations
p-dict-pair :: Cell String -> Cell Any -> Propagator
c-dict-accessor :: String -> Cell (Map String Any) -> Cell Any -> Propagator
recursive-accessor :: [String] -> Cell (Map String Any) -> Cell Any -> Propagator

;; Higher-Order
bi-switcher :: Cell Boolean -> Cell Any -> Cell Any -> Propagator
carrier-map :: Cell ([Cell Any] -> Propagator) -> Cell (Map String Any) -> Cell (Map String Any) -> Propagator
```

## Usage Patterns

### Creating a Struct Carrier

```scheme
(let ((x (construct-cell "x"))
      (y (construct-cell "y")))
  (let ((struct (ce-struct (make-record "x" x "y" y))))
    ;; struct is a Cell containing Map("x" -> x, "y" -> y)
    ;; Changes to x or y propagate through struct
    ))
```

### Accessing Dictionary Values

```scheme
(let ((dict (ce-dict (make-map (list (cons "name" name-cell)
                                     (cons "age" age-cell))))))
  (let ((name-accessor ((ce-dict-accessor "name") dict)))
    ;; name-accessor is bidirectionally synced with name-cell
    ))
```

### Building Reactive Lists

```scheme
(let ((list (ce-list (list cell1 cell2 cell3))))
  (let ((doubled (ce-list-map (lambda (cell) 
                                 (ce-multiply cell (ce-constant 2)))
                               list)))
    ;; doubled contains cells that are always 2x the original
    ))
```

