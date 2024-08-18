import { Ok, Err, type Result, pack, Enum } from "../index";

type PercentError = {
	DivByZero: number;
	TotalLessThanN: number;
	NegativeResult: number;
};
const PercentError = Enum<PercentError>();

function percent(n: number, total: number): Result<string, PercentError> {
	const p = (n / total) * 100;

	if (total < n) return Err(PercentError("TotalLessThanN", p));
	if (total === 0) return Err(PercentError("DivByZero", p));
	if (p < 0) return Err(PercentError("NegativeResult", p));

	return Ok(`${p}%`);
}

const half = percent(1, 2);
console.log(half.or("0%"));

const double = percent(2, 1);
console.log(double.or("over 100%"));
