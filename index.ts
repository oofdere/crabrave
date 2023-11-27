export { type Result, Ok, Err } from "./src/result";
export { Some, None } from "./src/option";
export { type Enum, pack, match } from "./src/enum";

import { Ok, Err } from "./src/result";

type MyErrors = "NotString" | "TooShort"

function isLongString(s) {
    if (typeof s === "string") {
        if (s.length > 3) {
            return Ok<boolean, MyErrors>(true)
        }
        return Ok<boolean, MyErrors>(false)
    }
    return Err<boolean, MyErrors>("NotString")
}

