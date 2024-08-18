import { Enum, match, pack } from "..";

type Colors = {
	Red: number;
	Blue: number;
	Green: number;
	Rgb: [number, number, number];
};
const Colors = Enum<Colors>();

const red = Colors("Red", 128);
const green = Colors("Green", 128);
const blue = Colors("Blue", 128);

function toRGB(color: Colors): number[] {
	// returns number[]
	return match(color, {
		Red: (x) => [x, 0, 0],
		Green: (x) => [0, x, 0],
		Blue: (x) => [0, 0, x],
		Rgb: (x) => x,
	});
}

console.log(toRGB(blue)); // [ 0, 0, 128 ]
