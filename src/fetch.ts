import { EnumChecked, match, pack, type Enum } from "./enum";
import { Err, Ok, type Result } from "./result";

type FetchErr = {
	AbortError: DOMException;
	NotAllowedError: DOMException;
	TypeError: TypeError;
	OtherError: unknown;
};

async function f(
	input: string | URL | globalThis.Request,
	init?: RequestInit,
): Promise<Result<Response, FetchErr>> {
	try {
		return Ok(await fetch(input, init));
	} catch (e) {
		if (e instanceof DOMException) {
			return Err(pack("AbortError", e));
		}
		return Err(pack("OtherError", e)); //=>
	}
}

match(await f("i"), {
	//=>
	Ok: (x) => x, //=>
	Err: (x) =>
		match(x, {
			AbortError(x) {
				//=>
				console.log("wtaf");
			},
			_: (x) => x, //=>
		}), //=>
});
