import { ethers } from 'ethers';
import { getUnirepContract } from '@unirep/contracts'
import { formatProofForVerifierContract } from '@unirep/circuits'
import { DEFAULT_ETH_PROVIDER, } from '../cli/defaults';
import { checkDeployerProviderConnection, promptPwd, validateEthAddress, validateEthSk } from '../cli/utils';
import { IAttestation } from '.';

/**
 * An API module of Unirep contracts.
 * All contract-interacting domain logic should be defined in here.
 */
export class UnirepContract {
    url: string;
    provider: ethers.providers.JsonRpcProvider;
    signer?: ethers.Signer;
    
    // Unirep contract
    contract: ethers.Contract;

    constructor(unirepAddress?, providerUrl?) {
        this.url = providerUrl? providerUrl : DEFAULT_ETH_PROVIDER;
        this.provider = new ethers.providers.JsonRpcProvider(this.url)
         if (!validateEthAddress(unirepAddress)) {
            console.error('Error: invalid Unirep contract address')
        }
        this.contract = getUnirepContract(unirepAddress, this.provider)
    }

    async unlock(eth_privkey?: string): Promise<string> {
        let ethSk
        // The deployer's Ethereum private key
        // The user may either enter it as a command-line option or via the
        // standard input
        if (eth_privkey) {
            ethSk = eth_privkey
        } else {
            ethSk = await promptPwd('Your Ethereum private key')
        }

        if (!validateEthSk(ethSk)) {
            console.error('Error: invalid Ethereum private key')
            return ''
        }

        if (! (await checkDeployerProviderConnection(ethSk, this.url))) {
            console.error('Error: unable to connect to the Ethereum provider at', this.url)
            return ''
        }
        this.signer = new ethers.Wallet(ethSk, this.provider)
        return ethSk
    }


    async currentEpoch(): Promise<number> {
        return this.contract.currentEpoch()
    }

    async attesters(ethAddr: string): Promise<ethers.BigNumber> {
        return this.contract.attesters(ethAddr)
    }

    async numEpochKeyNoncePerEpoch(): Promise<number> {
        return this.contract.numEpochKeyNoncePerEpoch()
    }

    async treeDepths(): Promise<any> {
        return this.contract.treeDepths()
    }

    async userSignUp(commitment: string): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.userSignUp(
                commitment,
                { gasLimit: 1000000 }
            )
    
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return tx
        }
        return tx
    }

    async attesterSignUp(): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.attesterSignUp({ gasLimit: 1000000 })
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    async submitAttestation(attestation: IAttestation, epochKey: BigInt): Promise<any> {
        if(this.signer != undefined){
            const attesterAddr = await this.signer?.getAddress()
            const attesterExist = await this.attesters(attesterAddr)
            if(attesterExist.toNumber() == 0){
                console.error('Error: attester has not registered yet')
                return
            }
            this.contract = this.contract.connect(this.signer)
        } else {
            console.log("Error: shoud connect a signer")
            return
        }
       
        const attestingFee = await this.contract.attestingFee()
        let tx
        try {
            tx = await this.contract.submitAttestation(
                attestation,
                epochKey,
                { value: attestingFee, gasLimit: 1000000 }
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    async fastForward() {
        const epochLength = (await this.contract.epochLength()).toNumber()
        await this.provider.send("evm_increaseTime", [epochLength])
    }

    async epochTransition(): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const currentEpoch = await this.currentEpoch()
        let tx
        try {
            const numEpochKeysToSeal = await this.contract.getNumEpochKey(currentEpoch)
            tx = await this.contract.beginEpochTransition(
                numEpochKeysToSeal,
                { gasLimit: 9000000 }
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    async startUserStateTransition(blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTRoot: BigInt | string, proof: any): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.startUserStateTransition(
                blindedUserState,
                blindedHashChain,
                GSTRoot,
                formatProofForVerifierContract(proof),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }
        return tx
    }

    async processAttestations(outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, inputBlindedUserState: BigInt | string, proof: any): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.processAttestations(
                outputBlindedUserState,
                outputBlindedHashChain,
                inputBlindedUserState,
                formatProofForVerifierContract(proof),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }    
        return tx
    }

    async updateUserStateRoot( 
        newGSTLeaf: BigInt | string, 
        epochKeyNullifiers: BigInt[] | string[],
        blindedUserStates: BigInt[] | string[],
        blindedHashChains: BigInt[] | string[],
        transitionedFromEpoch: BigInt | number | string,
        fromGSTRoot: BigInt | string,
        fromEpochTree: BigInt | string,
        proof: any): Promise<any> {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.updateUserStateRoot(
                newGSTLeaf,
                epochKeyNullifiers,
                blindedUserStates,
                blindedHashChains,
                transitionedFromEpoch,
                fromGSTRoot,
                fromEpochTree,
                formatProofForVerifierContract(proof),
            )
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }
        return tx
    }

    async verifyEpochKeyValidity(
        GSTRoot: BigInt,
        currentEpoch: number,
        epk: BigInt,
        proof: any,
    ): Promise<boolean> {
        return this.contract.verifyEpochKeyValidity(
            GSTRoot,
            currentEpoch,
            epk,
            proof,
        )
    }

    async verifyReputation(
        outputNullifiers: BigInt[] | string [],
        epoch: number | BigInt | string,
        epk: number | BigInt | string,
        GSTRoot: BigInt | string,
        attesterId: number | BigInt | string,
        repNullifiersAmount: number | BigInt | string,
        minRep: number | BigInt | string,
        proveGraffiti: number | BigInt | string,
        graffitiPreImage: BigInt | string,
        proof: any,
    ): Promise<boolean> {
        return this.contract.verifyReputation(
            outputNullifiers,
            epoch,
            epk,
            GSTRoot,
            attesterId,
            repNullifiersAmount,
            minRep,
            proveGraffiti,
            graffitiPreImage,
            proof,
        )
    }

    async verifyUserSignUp(
        epoch: number | BigInt | string,
        epk: number | BigInt | string,
        GSTRoot: BigInt | string,
        attesterId: number | BigInt | string,
        proof: any,
    ): Promise<boolean> {
        return this.contract.verifyUserSignUp(
            epoch,
            epk,
            GSTRoot,
            attesterId,
            proof,
        )
    }
}