"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.match = void 0;
var ae = {
    str: function (x) { return x; },
    num: function (x) { return x; },
    nul: function (x) { return x; },
    union: function (x) { return x; },
};
function match(pattern, arms, _) {
    pattern[0];
    pattern[1];
    if (arms[pattern[0]]) {
        return arms[pattern[0]](pattern[1]);
    }
    else {
        return _(pattern[1]);
    }
}
exports.match = match;
var a = ["str", "string"];
var b = ["num", 1];
/*
// creates an object type to be used for matching
type Functionify<T> = {
    // biome-ignore lint/suspicious/noExplicitAny: users can use any return value, this is accounted for
    [K in keyof T]: (val: T[K]) => any;
};

// and these two functions are the only things you see in the compiled output
export function pack<E extends object>(...entry: EnumUnion<E>): Enum<E> {
    return { k: entry[0], v: entry[1] };
}

export function match<E, Fn extends Functionify<E>>(
    pattern: Enum<E>,
    arms: Fn,
): ReturnType<typeof arms[keyof typeof arms]> {
    // biome-ignore lint/suspicious/noExplicitAny: function is safe with other guard rails present to prevent values that don't match the function type
    return arms[pattern.k](pattern.v as any);
}
*/ 
