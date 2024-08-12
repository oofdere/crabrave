import { EnumChecked, match, pack, type Enum } from "./enum"
import { Err, Ok, type Result } from "./result"

// biome-ignore lint/suspicious/noRedeclare: makes sense to redeclare for Err
type Err = {
    AbortError: DOMException,
    NotAllowedError: DOMException,
    TypeError: TypeError,
    OtherError: unknown
}

// biome-ignore lint/suspicious/noRedeclare: <explanation>
type FetchResult = Enum<Result<Response, unknown>>

async function f(input: string | URL | globalThis.Request, init?: RequestInit): Promise<FetchResult> {
    try {
        return Ok(await fetch(input, init))
    } catch (e) {
        if (e instanceof DOMException) {
            return Err(['AbortError', e])
        }
        return Err(pack('OtherError', e))

    }

    return Err(pack('OtherError', undefined))
}

match(await f('i'), {
    Ok: (x) => { },
    Err: (x) => { }
})