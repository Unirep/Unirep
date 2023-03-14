---
title: "Zk Identity"
---

Generate a [Semaphore identity](https://semaphore.appliedzkp.org/)

```ts
import { ZkIdentity, Strategy } from '@unirep/utils'

// The identity can be generated randomly.
const identity1 = new ZkIdentity()

// Deterministically from a secret message.
const identity2 = new ZkIdentity(Strategy.MESSAGE, "secret-message")

// Or it can be retrieved from an existing identity.
const identity3 = new ZkIdentity(Strategy.SERIALIZED, identity1.serializeIdentity())
```

## trapdoor

Get the identity trapdoor

```ts
id.trapdoor
```

## identityNullifier

Get the identity nullifier

```ts
id.identityNullifier
```

## secret

Get the identity secret. Identity secret is an array of `trapdoor` and `identityNullifier`

```ts
// [id.trapdoor, id.identityNullifier]
id.secret
```

## secretHash

Get the secret hash. It is computed by `hash(id.secret)`

```ts
// hash(id.secret)
id.secretHash
```

## genIdentityCommitment

Generate the identity commitment. It is computed by `hash(id.secretHash)`

```ts
id.genIdentityCommitment(): bigint
```

## serializeIdentity

Serialize the identity object to a string.

```ts
id.serializeIdentity(): string
```