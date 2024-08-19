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

const FetchErr = Enum<FetchErr>();

export async function f(
	input: string | URL | globalThis.Request,
	init?: RequestInit,
): Promise<Result<Response, FetchErr>> {
	try {
		const res = await fetch(input, init);

		return res.ok
			? Ok(res)
			: res.status < 400
				? Err(FetchErr("Redirect", res))
				: res.status < 500
					? Err(FetchErr("ClientError", res))
					: Err(FetchErr("ServerError", res));
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
