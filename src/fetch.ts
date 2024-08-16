import { Enum, match, pack } from "./enum";
import { Err, Ok, type Result } from "./result";

type FetchErr = {
	AbortError: DOMException;
	NotAllowedError: DOMException;
	TypeError: TypeError;
	Redirect: Response;
	ClientError: Response;
	ServerError: Response;
};

const todo = (x?: unknown) => console.trace("todo!", x);
const FetchErr = Enum<FetchErr>();

export async function f(
	input: string | URL | globalThis.Request,
	init?: RequestInit,
): Promise<Result<Response, FetchErr>> {
	try {
		const res = await fetch(input, init);

		if (res.ok) {
			return Ok(res);
		}

		if (res.status >= 300 && res.status < 400) {
			return Err(FetchErr("Redirect", res));
		}

		if (res.status >= 400 && res.status < 500) {
			return Err(FetchErr("ClientError", res));
		}

		if (res.status >= 500) {
			return Err(FetchErr("ServerError", res));
		}

		return Ok(res);
	} catch (e) {
		if (e instanceof TypeError) {
			return Err(FetchErr("TypeError", e));
		}

		if (e instanceof DOMException) {
			return Err(FetchErr("AbortError", e));
		}

		throw e;
	}
}
