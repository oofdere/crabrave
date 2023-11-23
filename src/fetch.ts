import { Err, None, Ok, Option, Result, Some } from "..";

type FetchParams = Parameters<typeof fetch>;

type CrabFetch = (
	...data: FetchParams
) => Promise<Result<Result<Response, Response>, unknown>>;

const safeFetch: CrabFetch = async (input, init) => {
	try {
		const res = await fetch(input, init);

		const crabRes = new Proxy(res, {
			get: (target, prop, receiver) => {
				console.log("trapped!");

				if (prop === "body") {
					const body: Option<ReadableStream<Uint8Array>> = target.body
						? Some(target.body)
						: None();

					return body;
				}
				return Reflect.get(target, prop, receiver);
			},
		});

		console.log(crabRes);

		return Ok(res.ok ? Ok(crabRes) : Err(crabRes));
	} catch (error: unknown) {
		return Err(error);
	}
};

export { safeFetch };
