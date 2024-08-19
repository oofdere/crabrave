import { Enum } from "./src/enum";
import { Err, Ok, type Result } from "./src/result";

function mightError(): Result<"Success!", "Error Here!"> {
	if (Math.random() > 0.5) {
		return Err("Error Here!");
	}

	return Ok("Success!");
}

console.log(mightError());
