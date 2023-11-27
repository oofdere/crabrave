import { type Enum, match, pack, } from "./index";

type Colors = {
	Red: number;
	Blue: number;
	Green: number;
	Rgb: [number, number, number];
	Rgba: [number, number, number, number];
	Hsl: {
		hue: number,
		saturation: number,
		lightness: number
	},
	Css: string,
	None: null
};

const red = pack<Colors>("Red", 128) //=>
const green = pack<Colors>("Blue", 128) //=>
const blue = pack<Colors>("Green", 128) //=>
const rgb = pack<Colors>("Rgb", [128, 128, 128]) //=> const rgb: Enum<Colors>



function toRGB(color: Enum<Colors>) { // returns Enum<Colors>
	return match(color, {
		Red: (x) => pack<Colors>("Rgb", [x, 0, 0]), //=>
		Green: (x) => pack<Colors>("Rgb", [0, x, 0]), //=>
		Blue: (x) => pack<Colors>("Rgb", [0, 0, x]), //=>
		Rgb: (x) => pack<Colors>("Rgb", x) //=>
	});
}

console.log(toRGB(blue).v);

