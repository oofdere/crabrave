import { Enum, match, pack } from ".."

type Colors = {
    Red: number;
    Blue: number;
    Green: number;
    Rgb: [number, number, number];
};

const red = pack<Colors>("Red", 128) //=> const red: Enum<Colors>
const green = pack<Colors>("Green", 128) //=> const green: Enum<Colors>
const blue = pack<Colors>("Blue", 128) //=> const blue: Enum<Colors>

function toRGB(color: Enum<Colors>) { // returns number[]
    return match(color, {
        Red: (x) => [x, 0, 0], //=> (property) Red: (x: number) => number[]
        Green: (x) => [0, x, 0], //=> (property) Green: (x: number) => number[]
        Blue: (x) => [0, 0, x], //=> (property) Blue: (x: number) => number[]
        Rgb: (x) => x //=> (property) Rgb: (x: [number, number, number]) => [number, number, number]
    });
}

console.log(toRGB(blue)); // [ 0, 0, 128 ]