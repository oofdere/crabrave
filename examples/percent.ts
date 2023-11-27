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

const half = percent(1, 2); //=> Result<string, PercentErrors>
const half_str = match(half, {
    Ok: (x) => `${x}%`,
    Err: () => "Something went wrong."
})
console.log(half_str)

const double = percent(2, 1); //=> Result<string, PercentErrors>
console.log(double.k);