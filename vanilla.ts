enum ColorEnum {
	Red,
	Green,
	Blue,
}

const red = ColorEnum.Red;
const green = ColorEnum.Green;
const blue = ColorEnum.Blue;

console.log(red === ColorEnum.Red); // true
console.log(red === ColorEnum.Green); // false

type Color = {
	color: ColorEnum;
	value: number;
};

const red2: Color = {
	color: ColorEnum.Red,
	value: 128,
};

function toRGB(color: Color) {
	switch (color.color) {
		case ColorEnum.Red:
			return [color.value, 0, 0];
		case ColorEnum.Green:
			return [0, color.value, 0];
		case ColorEnum.Blue:
			return [0, 0, color.value];
	}
}

console.log(toRGB(red2));
