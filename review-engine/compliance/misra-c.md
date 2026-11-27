# MISRA C:2012 and MISRA C:2023: code review checklist

Source: MISRA C:2012, Guidelines for the use of the C language in critical systems, with Amendments 1 to 4, and MISRA C:2023, which combines them, published by MISRA, https://misra.org.uk/misra-c/. The guidelines are copyrighted by MISRA and are sold by MISRA, so the checks below do not repeat their wording. Each check describes the risk and what to look for in our own words, and cites only the rule or directive number (a directive is written Dir, a rule is written Rule). Check the numbers and exact requirements against your licensed copy.

MISRA C is a coding standard for C in safety-critical and embedded software. Many guidelines can be checked by a tool, so a reviewer's main value is to spot patterns and deviations a tool would flag, and to ask for a recorded deviation where a guideline is knowingly broken. Only a selection of guidelines is listed here.

## When this applies

Apply these checks only to changed C code (`.c` and `.h`) in a project that says it follows MISRA C, which is usually embedded, automotive, medical, aerospace or industrial software. If the changed code is not C, or is documentation or build text only, report this standard as `not_applicable`.

Judge each check against the project's chosen MISRA version, its guideline classifications (mandatory, required, advisory), and its list of approved deviations. A deviation recorded with a reason, in the project's way, is not a breach.

## Checks

### [MISRA C Dir 4.1] Run-time failures are guarded against
Look for: array indexing, division, pointer use, arithmetic that can overflow, and conversions with no check or design reason that failure can't happen. Added defensive checks removed because "this can't happen".
Decided from code: partly. Some cases need range analysis across modules.

### [MISRA C Dir 4.7] Error information from functions is tested
Look for: calls to functions that report errors through a return value or an error variable, where the result is not checked, or the error is detected and then dropped.
Decided from code: yes.

### [MISRA C Dir 4.12] Dynamic memory allocation is not used
Look for: new use of `malloc`, `calloc`, `realloc`, `free` or of libraries that allocate on the heap during operation, in a project that bans or restricts them.
Decided from code: yes.

### [MISRA C Dir 4.14] Data from outside the program is validated
Look for: values from communication links, files, sensors, user input or other processes used for sizes, indexes, loop bounds or decisions before any check of range and consistency.
Decided from code: yes.

### [MISRA C Rule 1.3] The code has no undefined or unspecified critical behaviour
Look for: signed integer overflow, shifts by an out-of-range amount, use of a value before it's set, reads past an array, modifying an object twice with no ordering, and other things the language leaves undefined.
Decided from code: partly. Some undefined behaviour needs data-flow analysis.

### [MISRA C Rule 2.1] There is no code that can never run
Look for: statements after `return`, `break` or `goto`, branches whose condition is always true or false by construction, and code left over after a change.
Decided from code: yes.

### [MISRA C Rule 8.4] Functions and objects with external linkage have a matching declaration in scope
Look for: a new non-static function or global defined with no prior declaration in a header, or with a declaration that differs from its definition.
Decided from code: yes.

### [MISRA C Rule 9.1] Variables are set before they are read
Look for: automatic variables read on some path before any assignment, partial initialisation of structures or arrays, and variables set only in some branches.
Decided from code: partly. Complex paths may need a tool.

### [MISRA C Rule 11.3] Pointers to one object type are not converted to another object type
Look for: casts such as `(uint32_t *)` applied to a `uint8_t *`, or casts of a buffer address to a structure pointer, which can break alignment and aliasing rules.
Decided from code: yes.

### [MISRA C Rule 11.8] Casts don't remove `const` or `volatile`
Look for: a cast that drops `const` or `volatile` from a pointer's target, so that read-only data may be written or hardware access may be optimised away.
Decided from code: yes.

### [MISRA C Rule 13.2] The result of an expression doesn't depend on the order it is evaluated
Look for: a variable that's modified and also read in the same expression, function arguments with side effects that interact, and calls to functions that change shared state used in one expression.
Decided from code: yes.

### [MISRA C Rule 15.7] Every `if`...`else if` chain ends with a final `else`
Look for: chains of `else if` with no final `else` and no comment or defensive action for the case where none matches.
Decided from code: yes.

### [MISRA C Rule 16.3] Each `switch` clause ends in a way that doesn't fall through by accident
Look for: `case` labels that run into the next one, with no `break`, `return`, or other clear end, and no recorded reason.
Decided from code: yes.

### [MISRA C Rule 16.4] Every `switch` has a `default` clause
Look for: `switch` statements without `default`, including on enumerations where new values may be added later.
Decided from code: yes.

### [MISRA C Rule 17.2] Functions don't call themselves, directly or indirectly
Look for: recursion, including mutual recursion through several functions or callbacks, which can exhaust a fixed stack.
Decided from code: partly. Indirect recursion through function pointers may not be visible.

### [MISRA C Rule 17.7] The returned value of a function is used or deliberately ignored
Look for: calls to non-void functions whose result is dropped with no cast to `void` or other sign that it was intended.
Decided from code: yes.

### [MISRA C Rule 18.1] Pointer arithmetic stays inside the array it started in
Look for: pointer increments and offsets that can pass the start or end of the array, and indexes computed from outside data with no bounds check.
Decided from code: partly.

### [MISRA C Rule 18.6] The address of a local object isn't kept after the object ends
Look for: functions that return the address of a local variable, or store it in a global, structure or pointer parameter that lives longer.
Decided from code: yes.

### [MISRA C Rule 22.1] Resources that are acquired are released
Look for: file handles, memory, locks or other resources obtained and not released on every path, including early returns on errors.
Decided from code: partly. Complex paths may need a tool.
