import { Ok, Err, Result, Enum, pack, match } from "../index";

type PercentError = {
    DivByZero: number,
    TotalLessThanN: number,
    NegativeResult: number
}

function percent(n: number, total: number): Result<number, Enum<PercentError>> {
    const p = n / total * 100;

    if (total < n) return Err(pack("TotalLessThanN", p));
    if (total === 0) return Err(pack("DivByZero", p));
    if (p < 0) return Err(pack("NegativeResult", p));

    return Ok(p);
}

function stringify_percent(res: Result<string, Enum<PercentError>>) {
    match(res, {
        Ok: (x) => `${x}%`,
        Err: () => "Something went wrong."
    })
}

const half = percent(1, 2);
const half_str = stringify_percent(half);
console.log(half_str);

const double = percent(2, 1);
const double_str = stringify_percent(half);
console.log(double_str);