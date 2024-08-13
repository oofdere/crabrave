---
"@oofdere/crabrave": major
---

## whar?
we are now lying to tsc to make the thing work well, unfortunately this is a breaking change. but ONLY in your types; logic will work the same as it already did.

## whyyyyyy?
because typescript really hated what we were doing before so now we hide that from it so it hates it less

## haEh to upd8 code????
to update your code just replace all instances of `Enum<E>` with `E`. that's right, just the object is all you need. that's right, no more `Enum<Result<Enum<Success>, Enum<Error>>>`, now it's just `Result<Success, Error>`.

> these release notes are highly unserious because no one should have had this deployed anywhere at the time of these changes. but they are accurate.