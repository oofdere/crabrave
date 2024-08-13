import type { Enum } from "./enum";
import "./unwrap";

export type Result<T, E> = {
    Ok: T,
    Err: E
}

export const Ok = <T, E>(ok: T, _err?: E): Result<T, E> => ["Ok", ok] as unknown as Result<T, E>;
export const Err = <T, E>(err: E, _ok?: T): Result<T, E> => ["Err", err] as unknown as Result<T, E>;
