import { Enum, match } from "./index";

type Coins = {
	Penny: 1,
	Nickel: 5,
	Dime: 10,
	Quarter: 25,
}
const Coins = Enum<Coins>()

// you have to specify a value, but the type checker won't let you enter anything other than the preset value
const penny = Coins("Penny", 1);

match(penny, {
	Penny: () => "penny",
	Nickel: () => "nickel",
	Dime: () => "dime",
	Quarter: () => "quarter",
});
