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
Epoch key of epoch 1 and nonce 0: 3d
Unirep.epkProof.WyI2NzQ5ODQ4MDE5MjM2NzQwMDU3NDY5MDUzMjA1MDQ2NjIwNjgyMzE5MTU5NTkxNzgwNTMyOTQ0NTQxMzM4MTU1MDQ0NTYxNjk5MDMiLCIyODU2MjMzMzY3MjYwMTUyNTIzNjEwODQ4MzQ3MDQxNzY4NTYxOTUxMTY0ODQ4NjIwMjQ0NDcwODU5Nzc3Mjk1MTEyOTA2NjIwNjMxIiwiMjAyMDIwMzE3NTE0NDQ1NjkxMjAzOTE0NDIyMjM2NzI4NjkyNjczMjg2NTMwNzk0OTYyNzA4Njk5MzAyNTQ5MjMwNzU5MTAxNjMyNSIsIjEyNjcxMjU3MTY4OTc5NDMxODg3NDUyNDE1NzI1MjkwNzk4NTUwOTk1MjUzNDY5NDMwNjI5NDkzMzg2NDEyMDU4MDYxOTk3NDg4ODkwIiwiNzQxMDcwMDk1ODg2Mjg3NzM4Mzg0MDc0MTQ4MjgzMTk0NDEzODQ4MjY0MDIzOTMwNTIwMDU1ODMwNTQ1OTUyMjMxNTk0NjQ2MDEzOSIsIjc0NDcxOTU0NjUxNjI2MjI2MDMzNzMwNzQxOTE5NTA1MTkzMTk2MTcyNTY0NzY2MTY1Nzc4MTkyMDQ4NzQ3MDc5MTIyNjMwOTU5OTAiLCIxNjczMTAyMjczMDE1NzU0ODc2NzUxNTU5MzUyMzgwMTc2MTcyMTU3MDg1ODgwNDk1ODI5MDIyOTcyNzg3Njg0NTY3NDcwNDcxNzI4MCIsIjcxNDAzNjc1NjY0MDIwMjkxNDAxMDI1Njg5Mzk4NDQ1OTUwNDMwODcyNDg3NDYwNzE5NzM2Mzg1NDA3Njk0NDQ0OTM4MTQ0MDg3MjYiXQ
```
#### 8. Attester verify epoch key proof
```
npx ts-node cli/index.ts verifyEpochKeyProof \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -epk 3d \
    -pf Unirep.epkProof.WyI2NzQ5ODQ4MDE5MjM2NzQwMDU3NDY5MDUzMjA1MDQ2NjIwNjgyMzE5MTU5NTkxNzgwNTMyOTQ0NTQxMzM4MTU1MDQ0NTYxNjk5MDMiLCIyODU2MjMzMzY3MjYwMTUyNTIzNjEwODQ4MzQ3MDQxNzY4NTYxOTUxMTY0ODQ4NjIwMjQ0NDcwODU5Nzc3Mjk1MTEyOTA2NjIwNjMxIiwiMjAyMDIwMzE3NTE0NDQ1NjkxMjAzOTE0NDIyMjM2NzI4NjkyNjczMjg2NTMwNzk0OTYyNzA4Njk5MzAyNTQ5MjMwNzU5MTAxNjMyNSIsIjEyNjcxMjU3MTY4OTc5NDMxODg3NDUyNDE1NzI1MjkwNzk4NTUwOTk1MjUzNDY5NDMwNjI5NDkzMzg2NDEyMDU4MDYxOTk3NDg4ODkwIiwiNzQxMDcwMDk1ODg2Mjg3NzM4Mzg0MDc0MTQ4MjgzMTk0NDEzODQ4MjY0MDIzOTMwNTIwMDU1ODMwNTQ1OTUyMjMxNTk0NjQ2MDEzOSIsIjc0NDcxOTU0NjUxNjI2MjI2MDMzNzMwNzQxOTE5NTA1MTkzMTk2MTcyNTY0NzY2MTY1Nzc4MTkyMDQ4NzQ3MDc5MTIyNjMwOTU5OTAiLCIxNjczMTAyMjczMDE1NzU0ODc2NzUxNTU5MzUyMzgwMTc2MTcyMTU3MDg1ODgwNDk1ODI5MDIyOTcyNzg3Njg0NTY3NDcwNDcxNzI4MCIsIjcxNDAzNjc1NjY0MDIwMjkxNDAxMDI1Njg5Mzk4NDQ1OTUwNDMwODcyNDg3NDYwNzE5NzM2Mzg1NDA3Njk0NDQ0OTM4MTQ0MDg3MjYiXQ
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
Epoch key of epoch 1 and nonce 0: 3d
Unirep.reputationProof.WyIxMjc5NTQ0NDQzNDU4MzE0OTc0NTAzMzAzMjA4MzM1NzIyOTA2OTk1NzIzOTY2MjAzNDQyMzQxMTY1MjkzMTc1OTcxNzk0NzI0NzQwMyIsIjE0NTM3NTQzNDIwMTIwMDQzMjczMTYwMzYxMTMzMzc2MDc1OTAxNTg0ODc5Mzc2NTQ3NjU1MTcyMTgyODQzMzYwNTAwMzQ3OTI2NDMzIiwiNDcyMjIzMjgyNzg3OTA3MDY2NDExMzUxMTQ0NTQyMzI3NTcwNjEyMDk4MzUxNTU0ODkzMzEzMzA5MzI4OTQ1MjY1MjUwMTY2Mzc0OSIsIjE2NzM0NDc0NDExNDc2OTYyMjU2ODAxODE3MTIwNDgwMTE5NjcwOTI5NjA5ODg1NjgyNjk5MjU2MDQ1Mzg3Mjg0NzQyMjY1NTg0MzE1IiwiMTc4ODAzNjQ2ODY3MTg5NTA0OTQ2MTYyNzA5OTUyNTE4NjI3MzAwODM0MzAwMTIyMzgyMzA2NzcyMzEwMDY5NTE0NDYzMDE2ODMyMTAiLCIxNDU0NDU1NDA4NDM1MjE0NjQ2MzgxNDg3NzQwMTY2ODIxMzUwODEzMzAzNDAwMjM3NDgxOTI2Mjg5MTg2NjA3MjU3NDA4NjY3MjE0NyIsIjEyNjE1ODU4Mjg3ODU1ODI3NDk5OTY4OTE4NzM1MjYyNzk5NjY1MzI1OTIyNTgyNTczMzc1NjE3MTIyNjYxNDg5NjU4NTQzOTY0OTEwIiwiMTE3NDgxNjE0NTA2OTYxOTEwNTAyOTMzNzYxOTc4OTE1MzU4NjQzNzkzMTg0MzY0MDAzNjcwOTcxMjQzNTA4MTM1NDE3MzQyNDg3OCJd
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
    -epk 3d \
    -pf Unirep.reputationProof.WyIxMjc5NTQ0NDQzNDU4MzE0OTc0NTAzMzAzMjA4MzM1NzIyOTA2OTk1NzIzOTY2MjAzNDQyMzQxMTY1MjkzMTc1OTcxNzk0NzI0NzQwMyIsIjE0NTM3NTQzNDIwMTIwMDQzMjczMTYwMzYxMTMzMzc2MDc1OTAxNTg0ODc5Mzc2NTQ3NjU1MTcyMTgyODQzMzYwNTAwMzQ3OTI2NDMzIiwiNDcyMjIzMjgyNzg3OTA3MDY2NDExMzUxMTQ0NTQyMzI3NTcwNjEyMDk4MzUxNTU0ODkzMzEzMzA5MzI4OTQ1MjY1MjUwMTY2Mzc0OSIsIjE2NzM0NDc0NDExNDc2OTYyMjU2ODAxODE3MTIwNDgwMTE5NjcwOTI5NjA5ODg1NjgyNjk5MjU2MDQ1Mzg3Mjg0NzQyMjY1NTg0MzE1IiwiMTc4ODAzNjQ2ODY3MTg5NTA0OTQ2MTYyNzA5OTUyNTE4NjI3MzAwODM0MzAwMTIyMzgyMzA2NzcyMzEwMDY5NTE0NDYzMDE2ODMyMTAiLCIxNDU0NDU1NDA4NDM1MjE0NjQ2MzgxNDg3NzQwMTY2ODIxMzUwODEzMzAzNDAwMjM3NDgxOTI2Mjg5MTg2NjA3MjU3NDA4NjY3MjE0NyIsIjEyNjE1ODU4Mjg3ODU1ODI3NDk5OTY4OTE4NzM1MjYyNzk5NjY1MzI1OTIyNTgyNTczMzc1NjE3MTIyNjYxNDg5NjU4NTQzOTY0OTEwIiwiMTE3NDgxNjE0NTA2OTYxOTEwNTAyOTMzNzYxOTc4OTE1MzU4NjQzNzkzMTg0MzY0MDAzNjcwOTcxMjQzNTA4MTM1NDE3MzQyNDg3OCJd \
    -th 0xcef9b243764caa90471ceb152b8abae31b2054d5087e43878b0f0c22f229309f \
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
    -epk 3d \
    -uv 3 \
    -id Unirep.identity.WyIxNzk1MTYyYWM2ZDVkZGQ4NWEyMzA0MDdkMjNiOTk3NDU0YmYwNzY2Zjg5ZThkNTQxNWE3ZTIyNTIyN2IxODRiIiwiZDgyNjA0ODY5Njk4NTU3MGMwYzNmNDlhM2RiZDg4MWJjOWJhYjc4Yzg2ZmM0N2UyOTMwNWVjMDEyMDNkZSIsImRkNmZiNDRkMTY3YjFmOTZiYzViZDUyYjdjNGRjOTNiYjhmNDA0Y2Q5YzBjMjA5ODU0ZWMyZWJlOGE0OTMyIl0 \
    -n 0 \
    -kn 0 \
    -gf 176ff05d9c7c4528b04553217098a71cd076d52623dab894a7f7ee34116ca170 \
    -db
```
- NOTE: the attester's epoch key and base64url encoded reputation proof will be printed and they should be handed to attester to be verified, for example:
```
Epoch key of epoch 1 and nonce 0: a7
Unirep.reputationProof.WyIyMDAyODYzNjc5ODAzNTYwMTk5NzM4NDczNzUwNzkxMzY4MDMwMjA3MDU0NDY5OTE0MzgxMTI4MzM5MjEwNTkxMzQwMDY2MDkzODA0OCIsIjE3MDg0NjM3ODAxOTYzNDI3ODYyNjkyNDI2OTE1MDU5NzY4MTE2NjY3NjU3NDg4ODA1OTE4MTIzODU2NDM2NDgzMzYwOTU5MTkxMTA0IiwiMTExMTA0MTMyNDUxNTMzNjE2OTEyMjA1MDE0MTU5NzM3NTMwODM1OTA0NjM0MjM5OTQzMjkyNTQ0NzMxMDA0NzQxODk5NDM5MzA5MTgiLCIyMTA0OTcxNzY0MDAzNTk4NzI5NTYzNTE2Mzk0NjM2ODM2ODc3MjU2MjAwNjYyOTkxODU4NDIyNzkzMzgzOTM2MTk3MjIyNjU4MjAyMSIsIjkxOTkxMDc0ODk0ODcyOTc5MzYyNDg2NTE2NDk2ODQ1OTUxMjIzNTAyMzM0MDczMzAxODQyODMyOTM1NjU1NzMzNzIwMDY3OTM1ODAiLCIzOTMwMjI5Mzg0ODE0MzExNDcyNjc1NDUyMTYwMzMyOTAxOTAwNjI4MTA0NjMxNDc3MTg4MDkxMzQ3ODE1ODE3ODYzODIwNzI0NzciLCI1ODU5NTYxNTExOTM3Nzk2OTM5NDI2NzYxMTg2OTgyMjE2ODM0NjUwMTU0MTQ0NzcyMDcwMzA5NDMxMDk2NDcyOTI2MDI1NDQ5NjA3IiwiMjgzMjg4NDk5NTU0MTkxMDI3NjU0MzgwMjkwMjI3MDQxNDAwMjc4NzY4MTQ1MTAyODQzNDE2NTMzMTc3Mjk2MDE3OTY4NzQzNTMyOSJd
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
Unirep.reputationProofFromAttester.WyI2MDg3ODUwNDcyMTY0MTEyNTYzNTQ4ODg2ODU1ODkwNTI2NjM2MDQwNzQ4MDEyMjYwNTk0MDkxMzE4NDMwNDQyODI3ODAxNjIwNDQiLCI1OTI4NjY3Njk5OTE3MTg0MjAyNzcwNjkzMzIwNDI4Nzk5MjY5MDc1MjE5MTA3NTUwMjc4ODkyNDk4MzA0MzgyMzIzMzkzMTA5NTIzIiwiMjAzNDA0OTMxMTA5OTA0NzYyNjQzNjQ1MDc2MzI1ODE4NzcwOTc2NjMzOTIzNDMyODY4NTI4NTQwNzgwNTExOTA1MDQzMzcyMTU2NjAiLCIxNzQ3NDgyMTk2MDQ0ODA2NzUwMDQ1NDY2OTg4MTk3NjM4Njc4NTE5MDg2Nzc4NjQ2MjU5OTgxNTI4NjI0MjU3ODcxNTIyMDAwOTA4OCIsIjEzODI2NDg2NjAxNDQyMzE1MTA2MTQ4OTYxNDc4MzcwOTY3OTYyMDMzMTE4MDI1NDc1NjkxNjkxNTE0MjI2MzM2NDE1NDY0MDI3Nzg3IiwiMTU2OTcwNTA3ODY1Mzk2ODAyMzM1MzcwNzk3MDk2NDU3MTMxNjIzNzU2ODQ1MTc1MzgwMDUzOTIzMzAzNTc1MzE3NjA3MzU3MTc0ODIiLCI3MjQ1MTE4NjIzODE4OTUzNDI0Njg0MTQ4MzQyNTQ1ODgzMzgyMjAxMzM0NjMwNjMzOTk1MTcyNjcyMDgzOTQzMzY2MTM1ODE4ODYzIiwiMTEyMTE5Mjk2NzQ5MTM0MDIxMDY0MDc1OTY1MTU2NTY4NTQwOTU3Mjk4NTcwOTU5NTg3OTg2MjYyMzIzNjI2MTM3NTA3NTgxOTQwMjciXQ
```

#### 15. Verify the reputation proof
```
npx ts-node cli/index.ts verifyReputationProofFromAttester \
    -x 0x0165878A594ca255338adfa4d48449f69242Eb8F \
    -a 2 \
    -mp 2 \
    -mn 1 \
    -gp 0 \
    -pf Unirep.reputationProofFromAttester.WyIxMjM2MjYzNzk3MTYzMTYwNzk2MjAyMjAxNDUyOTc3NDcyNTc1NTI2MTY3NDM4OTI3OTk1NDQzODg0OTYxODIxNjgwNTY1OTM3ODg1MyIsIjIwOTIwODEzODg5NDc2OTAzMDY2MzYxMDA5NzE0MDY1MzU0MzYzNTg1MTc3NDI4MTg3NzkzMTI3Mjg1MDkyMzI0NjU1NjA3NTQ4Mzc0IiwiMTM0OTUwNjg4MzI3ODI2NjY5Mzg4NDYxNzkwMDE4NjQ3MzAwNjExMDU4NDkyMTYwNTQxNjE1NzQ4MTAzOTg4MzU3OTYwMjc1OTkxMTEiLCI2MzkzNTk0MDk3NDMyMDQzODMyMDQ3MDkzNzIyMzY3NTY2ODUzODYzMDA3NTA2MDU4MzU3MTA1OTM2MTcwMTM0NzE1NDcyMzY3NTMyIiwiNDg0MDAyOTk0ODUzNzExMDM1MzQ5OTEzMzA4NTQzOTAzNzMxMDQ0MTE5NTMxOTI1NTcxNTIwNDg1MjU4MDY1NTg3MTUyNzUzODAyNSIsIjE1NTE2NDExMzU0MzgyMjEzMDk5OTEwMjc3Nzk4MjYyMzg0NjA3MDAwMTM3MDgzMzY5MTg2NDIyNDA4ODM2MTcwODg5NDcxMjIwMDMiLCI0NjcxMDg4MzQ4MTQ5OTY5NzY3MDc3ODkyNzk3NDUwNzQ0NjU2MTg1MDI1MjgzOTUzNTc2MTk5MzgwMDIyNTY1MTA2Nzk2OTQwMTY4IiwiMTMyOTU4OTgwMTcwODEyNDE2MzIxNzUyMDY3MDExNzA4MTA3MDY1NzM5Nzg5NDQzMTg0ODgzNjMwNzA4NDA4OTMzOTY3NDMwODI2OSJd
```