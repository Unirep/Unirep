---
description: Polynomial Checksum
---

# Polysum

In various places we need to calculate a checksum for a large number of elements. We can safely do this when the elements are distributed evenly over a field (e.g. using `Poseidon`).

First we select a random value `R`. This value can be re-used.

Then for a set like `[s0, s1, s2, s3]` we calculate the polysum using:

`s0*R + s1*R^2 + s2*R^3 + s3*R^4`

## Safety

The input values must be randomly distributed. If an adversary is able to select the input values they can calculate a collision for any checksum in `O(log(n)^3)` time.

In ZK proofs the input to a polysum **cannot** be an input signal. It must be the output of e.g. poseidon calculated __in the proof__.

For more info about polysum safety see [here](https://crypto.stackexchange.com/questions/103357/data-fingerprint-using-polynomial-and-schwartz-zippel-lemma). For more info about finding collisions see [here](https://crypto.stackexchange.com/questions/103860/is-it-possible-to-solve-a-linear-polynomial-in-a-finite-field).
