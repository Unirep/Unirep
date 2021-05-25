# Unirep With MongoDB

For more information about Unirep, refer to the [documentation](https://vivi432.gitbook.io/unirep/)

## Install and build

```
npm install
```

then run

```
npm run build
``` 
to build the circuits

## Example flow using cli commands with mongoDB

- Follow the instructions to install mongoDB: [Install MongoDB Community Edition](https://docs.mongodb.com/manual/administration/install-community/)

#### 1. Start a mongoDB server
It handles data requests, manages data access, and performs background management operations.
The data will be stored in the `<data path>`.
```
mongod --dbpath <data path>
```

#### 2. Spin up the testing chain
```
npx hardhat node
```
- NOTE: a list of default accounts will be printed, choose one of them to be user's account and one to be attester's. User's and attester's private key will be referred to as `userPrivateKey` and `attesterPrivateKey` respectively.

#### 3. Deploy Unirep contract
```
npx ts-node cli/index.ts deploy -d 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
- NOTE: Unirep contract's address will be printed. For example, `Unirep: 0x0165878A594ca255338adfa4d48449f69242Eb8F`

#### 4. Start an event listener
The listener will be triggered for events on the Unirep contract, and it will store the emitted data in mongoDB.
```
npx ts-node cli/index.ts eventListeners -x 0x0165878A594ca255338adfa4d48449f69242Eb8F
```

#### 5. User sign up
```
npx ts-node cli/index.ts userSignup \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -c Unirep.identityCommitment.MTI0ZWQ1YTc4NjYzMWVhODViY2YzZDI4NWFhOTA5MzFjMjUwOTEzMzljYzAzODU3YTVlMzY5ZWYxZmI2NTAzNw \
    -d 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
- MongoDB stores
    - Settings in the Unirep contract (only triggered once)
    - current epoch of this event
    - Hashed leaf in the global state tree
    - transaction hash of this event

#### 6. Attester signs up
```
npx ts-node cli/index.ts attesterSignup \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -d 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

#### 7. User generates epoch key and epoch key proof
```
npx ts-node cli/index.ts genEpochKeyAndProof \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -n 0
```
- NOTE: `-id` is user's identity and `-n`  is epoch key nonce which should be less than the system parameter `maxEpochKeyNonce`
- NOTE: epoch key and base64url encoded epoch key proof will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: 69
Unirep.epkProof.WyIxNjA4MjU3MzE4NTE4MzU0NjcyNTQ5Mjc1Njg1NDMwMDkwMTEwMjUxNDU0NTAwODQ2NjQ1MTk5Mjg5MzY3NjgwNTI4ODc1MDQ2MjY5NiIsIjE0MzE1OTI5OTQzMDI4NTY5MjA4OTQ3NTYyMTI0MDA5MzUwMjgxMzM3MDQyMjk0MTMxODEzMjI4Mzc5NjY5NzgwNTM5NTQwMzgxNjkyIiwiMTI3NzA1NjIzMTA4OTE1MTEyNDEzOTU3ODQ2NjM0MTE1MDA0OTI4MjMwMDA1NjkzNjEwMjI0MzI1MTY5NjA0NzAzMTgxNzc4MDU0NTEiLCIxMDcwNDAyMTI0MzMwNzkwNzEyMTAxNzY0OTMyMjgwNzkyODgyNzMzNzkwODI1NjQ1NTc5NDAwOTA2OTgwMTc3NTA2OTQ4NzU0MzQyMyIsIjIxNjY5MzkzNjExNTY1MTY2MDU4MDkwMDQzMzYzMDk1MjE4ODY2NTMzOTU3MDY3NDk3NDI3NzU3NzU2NTc1MzExNzU0NzM3NjA1ODQ5IiwiNjE0NDg1NzE0MDQyODMwMTM5ODMxODk1MjI2OTIyODI4NzE2MDg5OTQ3OTAzNDE5MTQwMDA2MjM0MDQ3MDIwOTM1NTgyNDcxOTgzMiIsIjE1MTUxNDE2MDg2NTYxMzU3Njc4MjYzMjg2MDI4NzA2NjA1MTkyNjIyMjM4Mzk5NjkwNzY4MTc4MjE0MjQ3MTE0OTk0NzU5ODY3ODI0IiwiMTExMjE2Mzc3NTAyNTA5OTk1MjEwODUwMTAyNjMzMTIwNDMwOTgzOTE0OTM5NzU0Nzg4OTI0MTQ0NDMzNTk1NjA4NzU2MDA4NzM2MjYiXQ
```
#### 8. Attester verify epoch key proof
```
npx ts-node cli/index.ts verifyEpochKeyProof \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -epk 69 \
    -pf Unirep.epkProof.WyIxNjA4MjU3MzE4NTE4MzU0NjcyNTQ5Mjc1Njg1NDMwMDkwMTEwMjUxNDU0NTAwODQ2NjQ1MTk5Mjg5MzY3NjgwNTI4ODc1MDQ2MjY5NiIsIjE0MzE1OTI5OTQzMDI4NTY5MjA4OTQ3NTYyMTI0MDA5MzUwMjgxMzM3MDQyMjk0MTMxODEzMjI4Mzc5NjY5NzgwNTM5NTQwMzgxNjkyIiwiMTI3NzA1NjIzMTA4OTE1MTEyNDEzOTU3ODQ2NjM0MTE1MDA0OTI4MjMwMDA1NjkzNjEwMjI0MzI1MTY5NjA0NzAzMTgxNzc4MDU0NTEiLCIxMDcwNDAyMTI0MzMwNzkwNzEyMTAxNzY0OTMyMjgwNzkyODgyNzMzNzkwODI1NjQ1NTc5NDAwOTA2OTgwMTc3NTA2OTQ4NzU0MzQyMyIsIjIxNjY5MzkzNjExNTY1MTY2MDU4MDkwMDQzMzYzMDk1MjE4ODY2NTMzOTU3MDY3NDk3NDI3NzU3NzU2NTc1MzExNzU0NzM3NjA1ODQ5IiwiNjE0NDg1NzE0MDQyODMwMTM5ODMxODk1MjI2OTIyODI4NzE2MDg5OTQ3OTAzNDE5MTQwMDA2MjM0MDQ3MDIwOTM1NTgyNDcxOTgzMiIsIjE1MTUxNDE2MDg2NTYxMzU3Njc4MjYzMjg2MDI4NzA2NjA1MTkyNjIyMjM4Mzk5NjkwNzY4MTc4MjE0MjQ3MTE0OTk0NzU5ODY3ODI0IiwiMTExMjE2Mzc3NTAyNTA5OTk1MjEwODUwMTAyNjMzMTIwNDMwOTgzOTE0OTM5NzU0Nzg4OTI0MTQ0NDMzNTk1NjA4NzU2MDA4NzM2MjYiXQ
```

#### 9. User publish a post with an epoch key and proof
User can indicate to generate his user state from database using a `-db` flag. 
```
npx ts-node cli/index.ts publishPost \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -tx postText \
    -d 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -n 0 \
    -kn 0 \
    -db
```
- NOTE: epoch key and base64url encoded reputation proof will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: 69
Unirep.reputationProof.WyI3NzIzMzE4MTUzOTYzMzg2NDA2MzA3MTExMTk1ODY0NzA3Mzc3MzExODY4MzQ1MDExMjA1MTg2MDU3NTQ5NTc0NDcyMjI5OTAxMjQ5IiwiMjEzNzE1MzA2NTU3Nzg5NDMxNjE5NzAwMTU3ODM1MDQyMjU0Njk1ODQ0MTg0NTk5Njk2NTMwMjQ3NDEzODEyMTY1MDY5MjU3MTM5ODEiLCI2NjgwNDc3MzQ3ODQwMTE4OTU5NzQ0MDQ0Mzg3OTQ0MDA2MTA5NDY5NTgyMDc0NjYwMTcyNjcwODkzNjU4MDA3ODgyMzMzNTE4MjQxIiwiMTA0NTA0MTM3MDExMjQ2NTUyMzg0NjkyMzkyNzk3MjE3NjUxMTc3Njk2ODMzODAxNzE0NjY5Nzk5MTEyNDA3NDk5NjAzNjk0MjQwOTEiLCIyMDYxMTY2NTkzOTA4NDEzNTc2NzIxODk0MzczODkzNTEzMjg2NzcwMDQ1MjExNDkxODQwODE3MjAxNjk2NDU0ODk4MzAxNzI2NzAyMCIsIjQwMzkwNDg1Mjc2NjcxNTg1NjYxMDM5OTY0NTExMjYyNjI0NDUwOTU0MzM4MjYwNTUyNjQ2NTgwNTQ0NjgxNDQzNjI3NjE4MTkxNjkiLCIxOTc1MDE3NjEzODg3ODIzODk1MzA0MDI2ODkyMDgwMTg4MDQ0MTk3NDM2MTY0MjA2NTIzNDc0ODg5NjA0MzE4NTU4Nzk4ODk5NDgzMiIsIjIwNzI5NDY3MDMxMDYyMjAzNzIwNDg5MjM3OTczMTc0MDAyNTkwNDQxOTc1MTQzOTg4NTEyODUxMDE1MDE5MDQ3NzI2MTI2OTI3MjQiXQ
```
- After the post event is emitted, the database is triggered to store the following data:
    - reputation nullifiers and its corresponding action (`pubslitPost`, `leaveComment` or `vote`)
    - content of the post
    - transaction hash of this event
    - a negative reputation that sends to the author's epoch key as to spend this reputation.

#### 10. Verify reputation proof of certain transaction
```
npx ts-node cli/index.ts verifyReputationProof \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -epk 69 \
    -pf Unirep.reputationProof.WyI3NzIzMzE4MTUzOTYzMzg2NDA2MzA3MTExMTk1ODY0NzA3Mzc3MzExODY4MzQ1MDExMjA1MTg2MDU3NTQ5NTc0NDcyMjI5OTAxMjQ5IiwiMjEzNzE1MzA2NTU3Nzg5NDMxNjE5NzAwMTU3ODM1MDQyMjU0Njk1ODQ0MTg0NTk5Njk2NTMwMjQ3NDEzODEyMTY1MDY5MjU3MTM5ODEiLCI2NjgwNDc3MzQ3ODQwMTE4OTU5NzQ0MDQ0Mzg3OTQ0MDA2MTA5NDY5NTgyMDc0NjYwMTcyNjcwODkzNjU4MDA3ODgyMzMzNTE4MjQxIiwiMTA0NTA0MTM3MDExMjQ2NTUyMzg0NjkyMzkyNzk3MjE3NjUxMTc3Njk2ODMzODAxNzE0NjY5Nzk5MTEyNDA3NDk5NjAzNjk0MjQwOTEiLCIyMDYxMTY2NTkzOTA4NDEzNTc2NzIxODk0MzczODkzNTEzMjg2NzcwMDQ1MjExNDkxODQwODE3MjAxNjk2NDU0ODk4MzAxNzI2NzAyMCIsIjQwMzkwNDg1Mjc2NjcxNTg1NjYxMDM5OTY0NTExMjYyNjI0NDUwOTU0MzM4MjYwNTUyNjQ2NTgwNTQ0NjgxNDQzNjI3NjE4MTkxNjkiLCIxOTc1MDE3NjEzODg3ODIzODk1MzA0MDI2ODkyMDgwMTg4MDQ0MTk3NDM2MTY0MjA2NTIzNDc0ODg5NjA0MzE4NTU4Nzk4ODk5NDgzMiIsIjIwNzI5NDY3MDMxMDYyMjAzNzIwNDg5MjM3OTczMTc0MDAyNTkwNDQxOTc1MTQzOTg4NTEyODUxMDE1MDE5MDQ3NzI2MTI2OTI3MjQiXQ \
    -th 0x70610871081249467962399f53dff3c1e75502a3077d254e3e73c1b273e06537 \
    -act publishPost
```

#### 11. Attester upvote to epoch key
**11.1. Sign up the second user to perform upvote**
```
npx ts-node cli/index.ts genUnirepIdentity
npx ts-node cli/index.ts userSignup \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -c Unirep.identityCommitment.YTk0NjJjMWE5ZWY3NjM3MWVkOTFjNDA0YTYxYWJlMjVjMjJiMjVmMTM1MzU3NjFjNjE5OGE2YTA4MGUxMDBm \
    -d 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
npx ts-node cli/index.ts attesterSignup \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -d 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```
**11.2. Upvote the first user**
User can indicate to generate his user state from database using a `-db` flag. 
```
npx ts-node cli/index.ts vote \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -d 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
    -epk 69 \
    -uv 3 \
    -id Unirep.identity.WyIxNzk1MTYyYWM2ZDVkZGQ4NWEyMzA0MDdkMjNiOTk3NDU0YmYwNzY2Zjg5ZThkNTQxNWE3ZTIyNTIyN2IxODRiIiwiZDgyNjA0ODY5Njk4NTU3MGMwYzNmNDlhM2RiZDg4MWJjOWJhYjc4Yzg2ZmM0N2UyOTMwNWVjMDEyMDNkZSIsImRkNmZiNDRkMTY3YjFmOTZiYzViZDUyYjdjNGRjOTNiYjhmNDA0Y2Q5YzBjMjA5ODU0ZWMyZWJlOGE0OTMyIl0 \
    -n 0 \
    -kn 0 \
    -gf 2098f5fb9e239eab3ceac3f27b81e481dc3124d55ffed523a839ee8446b64864 \
    -db
```
- NOTE: the attester's epoch key and base64url encoded reputation proof will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: f6
Unirep.reputationProof.WyIzNjgwMDkxNDUwNDYxMDUwNTUyMDYxNzMyMzg1NTg4MzU0OTYzMjU2MDc4MDUxMzMwOTgzMjEwNzk3Njg0MTMyNTc4MzY4MDIzODIxIiwiMTk2MzkxNTY0OTIwMTkwNDczNDY2MzQzOTUzNjA4NDQ4NzkxMjE0MTQxMzExMzUwMTQxNzE3NDA5MDgwMjE4OTA3MTc5NjgwODcwNTQiLCIxNTQ1OTk0NDgyNzk0OTU5NjcwMjk4NTg3MTA1NTA3MDM0OTI2MzE5MDg4Njc4OTUxODA5MzU2MDU0MDQ5MDE1NzMwNjI2OTg0NzgxMyIsIjIwMzgzNDQ2MTExNzg4Mjc5NzkxNDI1Nzk2OTc0OTA1NDYxMzQ2NzE5NjMyNTkxMjIzNDYyNDM2MTU5MDYxMjM4OTE5MTYxNTE5NDU0IiwiMTkwODg5ODQyMzExMDYwNjY0MDc3ODU2MjI5NTAwMDM4OTg1NTU4MjY5MDQ4NDI5MzE0MTcyNjI1ODMyMzkwNjY1NzcyMzg4MDc2MDYiLCIxMjM5MTAwMjg4NzA3NjY1NDEyMTY0MTgzNDg3MTkzNzY4MzY0NDE2NzU3NTQyODA2NjM4MTkzMDY4NjU4ODIwNDQ5NzcwOTU1MDQwNiIsIjg4OTUxMjQ5OTI2NjQ4NTE1MzA2MjM1MjI2ODk3NTg3OTIwNTExODA0MjA0NTI1MjA0NTA1MTg4MzE4NTI1NTExNDczNTA2MjIxMjYiLCI0NTc1ODI2OTQwMjkzODIyNDE2OTAwNzc3Mjc2MjEyNTYwNTk1MzU0NTU1ODk1MTY4OTMyNDg3MTYxNjA2Mzk3NTUxNjgzMTY2NTIyIl0
```
- NOTE: The proof can also be verified with `verifyReputationProof` function with `-act vote`
- After the vote event is emitted, the database is triggered to store the following data:
    - reputation nullifiers and its corresponding action (`pubslitPost`, `leaveComment` or `vote`)
    - transaction hash of this event
    - a positive reputation that sends to the receiver's epoch key. (negative reputation if it is a downvote)
    - a negative reputation that sends to the author's epoch key as to spend this reputation.

#### 12. Epoch transition
```
npx ts-node cli/index.ts epochTransition \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -d 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
    -t
```

#### 13. User state transition
User can indicate to generate his user state from database using a `-db` flag. 
```
npx ts-node cli/index.ts userStateTransition \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -d 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -db
```
- After the user state transition event is emitted, the database is triggered to store the following data:
    - A new global state tree leaf that is generated by circuit
    - current epoch of this event
    - transaction hash of this event

#### 14. User generate reputation proof from certain attester
User can indicate to generate his user state from database using a `-db` flag.
```
npx ts-node cli/index.ts genReputationProofFromAttester \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -id Unirep.identity.WyJlOGQ2NGU5OThhM2VmNjAxZThjZTNkNDQwOWQyZjc3MjEwOGJkMGI1NTgwODAzYjY2MDk0YTllZWExMzYxZjA2IiwiODZiYjk5ZGQ4MzA2ZGVkZDgxYTE4MzBiNmVjYmRlZjk5ZmVjYTU3M2RiNjIxMjk5NGMyMmJlMWEwMWZmMTEiLCIzMGE3M2MxMjE4ODQwNjE0MWQwYmI4NWRjZDY5ZjdhMjEzMWM1NWRkNDQzYWNmMGVhZTEwNjI2NzBjNDhmYSJd \
    -a 2 \
    -mp 2 \
    -mn 1 \
    -gp 0 \
    -db
```
- NOTE: proof will be printed and it should be handed to the receiver of this proof, for example,
```
Proof of reputation from attester 2:
Unirep.reputationProofFromAttester.WyI3NDU0MzE2NzU3MDY1MDU3NzYwMjkxMDM4ODY2MDI3MzgzOTU1OTY3MzcxNzk5Mzg4Njc0NDc1ODY3NDE5MTQ2Njk5OTUzMjQxNjYiLCI5OTEzMzU1Nzk3NTAwOTMzMzI2MjE5ODUwOTI1NjU2MTQwOTEwNjc3ODUxODc4NTA5MDE1NDI4NzUzNDc1ODAwNTg2MjczNDMyNTg3IiwiMTQ1OTU2MDMyOTIyODU0NDYwNzM1NTEzMjI2NzAyMTc4NDIzOTU4Njg3Mzc0MDQ1NTg0MTY0Nzg3Mzg4ODMwMTU5MDA5NjA4ODIzOSIsIjczNTExMjAwMDYxOTYxNTI4NjQyMTI4NjYxNzEzMDMzMzQ4MDcxMjQzMzM4MjcxNDUyNTI1MjQzNjk4MzgxMTYxMTY1ODc3NTM4NjYiLCIxMTI0NTM1ODEwODY0MzE1MjY4MTI5NjA5MzUyNDY2MzQ3MTQ1MzAwMzAwMzIxOTk3NjQ3NzQ1MzMxNjk4NDc2NjUzMTUyMTM0MDMzMiIsIjU1NDA1NDA4OTc3NjMwMjIxODcwMDM4NTIyMzQ4ODMxMTEyMzY4MzAwNTA1MDU3OTc1NTA1OTcxOTQzODUzOTk2NjQ1MTU1OTY2MzEiLCIxMTk0MjUwMzcxNzI4NjE0MTMzNDk1NjMzNzg0MTEzNzAwNDQwNTkwNzY3ODI4NTQ0Nzc5MjgxNjcxODMxOTU3NzA1MjUyMDUyNzUiLCIzNjk1MTI2NzM5ODk2MTQwNzY2ODgwMjUxNTA2MTkxNTYwNDU5OTU4Njg0MTExODY1Nzg2MzAxODc3MDEwODM2NzQ2NjA4NTYyNTU1Il0
```

#### 15. Verify the reputation proof
```
npx ts-node cli/index.ts verifyReputationProofFromAttester \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -a 2 \
    -mp 2 \
    -mn 1 \
    -gp 0 \
    -pf Unirep.reputationProofFromAttester.WyI3NDU0MzE2NzU3MDY1MDU3NzYwMjkxMDM4ODY2MDI3MzgzOTU1OTY3MzcxNzk5Mzg4Njc0NDc1ODY3NDE5MTQ2Njk5OTUzMjQxNjYiLCI5OTEzMzU1Nzk3NTAwOTMzMzI2MjE5ODUwOTI1NjU2MTQwOTEwNjc3ODUxODc4NTA5MDE1NDI4NzUzNDc1ODAwNTg2MjczNDMyNTg3IiwiMTQ1OTU2MDMyOTIyODU0NDYwNzM1NTEzMjI2NzAyMTc4NDIzOTU4Njg3Mzc0MDQ1NTg0MTY0Nzg3Mzg4ODMwMTU5MDA5NjA4ODIzOSIsIjczNTExMjAwMDYxOTYxNTI4NjQyMTI4NjYxNzEzMDMzMzQ4MDcxMjQzMzM4MjcxNDUyNTI1MjQzNjk4MzgxMTYxMTY1ODc3NTM4NjYiLCIxMTI0NTM1ODEwODY0MzE1MjY4MTI5NjA5MzUyNDY2MzQ3MTQ1MzAwMzAwMzIxOTk3NjQ3NzQ1MzMxNjk4NDc2NjUzMTUyMTM0MDMzMiIsIjU1NDA1NDA4OTc3NjMwMjIxODcwMDM4NTIyMzQ4ODMxMTEyMzY4MzAwNTA1MDU3OTc1NTA1OTcxOTQzODUzOTk2NjQ1MTU1OTY2MzEiLCIxMTk0MjUwMzcxNzI4NjE0MTMzNDk1NjMzNzg0MTEzNzAwNDQwNTkwNzY3ODI4NTQ0Nzc5MjgxNjcxODMxOTU3NzA1MjUyMDUyNzUiLCIzNjk1MTI2NzM5ODk2MTQwNzY2ODgwMjUxNTA2MTkxNTYwNDU5OTU4Njg0MTExODY1Nzg2MzAxODc3MDEwODM2NzQ2NjA4NTYyNTU1Il0
```