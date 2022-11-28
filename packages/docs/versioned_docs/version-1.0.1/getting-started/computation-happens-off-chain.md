# Computation happens off-chain ℹ️

After you read through the introduction above, you should have a picture of how Unirep works. User/attester registers on-chain, attester submits attestations on-chain, user submits proof to update his state and also the global state tree of current epoch in Unirep contract. These all happens on-chain, including proof verification, updating global state trees and generating epoch trees, but these computation could be very expensive!

There are no on-chain assets that required latest state of the contract in order to transfer its ownership or to apply computation on it. There's no such asset in Unirep, all you have is one's reputation and proving one's reputation does not has to be done on-chain, instead the proof is transmitted to the verifier off-chain. So there's really no need to do all these computation on-chain!

So that's why the current implementation of Unirep is taking the **LazyLedger**-like approach - the Unirep contract (i.e., the underlying Ethereum chain) is serving as the data availability layer and the computations including proof verification all happen on top of this data availability layer. We log every user/attester actions like register/submit attestation/submit state transition proof and the according data. Then we perform state transition off-chain according to the order of when these events took place and everyone that does the same should arrive at the exact same global state! (assuming no re-org in the underlying data availability layer)

You can take a look at [`Synchronizer`](https://github.com/Unirep/Unirep/blob/main/packages/core/src/Synchronizer.ts) to better know how a user can fetch the events from the contract and build up the latest global state.
