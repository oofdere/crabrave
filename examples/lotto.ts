import { None, type Option, Some, match } from "..";

let pool = 0;
const chance = 0.1;
const games = 10000;

function play(): Option<number> {
	const win = Math.random() <= chance;
	pool += 1;

	if (win) {
		const winnings = pool;
		pool = 0;

		return Some(winnings);
	}

	return None();
}

let balance = 0;

for (const i of [...Array(games).keys()]) {
	console.log(play());

	balance += match(play(), {
		Some: (x) => x,
		None: (x) => -1,
	});
}

console.log(`Net balance: $${balance}`);

balance = 0;

for (const i of [...Array(games).keys()]) {
	balance += play().or(-1);
}

console.log(`Net balance: $${balance}`);
