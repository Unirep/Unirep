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
    private url: string
    private provider: ethers.providers.JsonRpcProvider
    private signer?: ethers.Signer;
    
    // Unirep contract
    public contract: ethers.Contract;

    constructor(unirepAddress?, providerUrl?) {
        this.url = providerUrl? providerUrl : DEFAULT_ETH_PROVIDER;
        this.provider = new ethers.providers.JsonRpcProvider(this.url)
         if (!validateEthAddress(unirepAddress)) {
            console.error('Error: invalid Unirep contract address')
        }
        this.contract = getUnirepContract(unirepAddress, this.provider)
    }

    public unlock = async (eth_privkey?: string): Promise<string> => {
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


    public currentEpoch = async (): Promise<any> => {
        return this.contract.currentEpoch()
    }

    public epochLength = async (): Promise<any> => {
        return this.contract.epochLength()
    }

    public latestEpochTransitionTime = async (): Promise<any> => {
        return this.contract.latestEpochTransitionTime()
    }

    public emptyUserStateRoot = async (): Promise<any> => {
        return this.contract.emptyUserStateRoot()
    }

    public emptyGlobalStateTreeRoot = async (): Promise<any> => {
        return this.contract.emptyGlobalStateTreeRoot()
    }

    public numEpochKeyNoncePerEpoch = async (): Promise<any> => {
        return this.contract.numEpochKeyNoncePerEpoch()
    }

    public maxReputationBudget = async (): Promise<any> => {
        return this.contract.maxReputationBudget()
    }

    public maxUsers = async (): Promise<any> => {
        return this.contract.maxUsers()
    }

    public maxAttesters = async (): Promise<any> => {
        return this.contract.maxAttesters()
    }

    public numUserSignUps = async (): Promise<any> => {
        return this.contract.numUserSignUps()
    }

    public hasUserSignedUp = async (idCommitment: BigInt | string): Promise<boolean> => {
        return this.contract.hasUserSignedUp(idCommitment)
    }

    public attestingFee = async (): Promise<any> => {
        return this.contract.attestingFee()
    }

    public collectedAttestingFee = async (): Promise<any> => {
        return this.contract.collectedAttestingFee()
    }

    public epochTransitionCompensation = async (ethAddr: string): Promise<any> => {
        return this.contract.epochTransitionCompensation(ethAddr)
    }

    public attesters = async (ethAddr: string): Promise<any> => {
        return this.contract.attesters(ethAddr)
    }

    public getAttesterId = async(): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const attesterAddr = await this.signer?.getAddress()
        const attesterId = await this.attesters(attesterAddr)
        return attesterId
    }

    public nextAttesterId = async (): Promise<any> => {
        return this.contract.nextAttesterId()
    }

    public airdropAmount = async (ethAddr: string): Promise<any> => {
        return this.contract.airdropAmount(ethAddr)
    }

    public treeDepths = async (): Promise<any> => {
        return this.contract.treeDepths()
    }

    public userSignUp = async (commitment: string): Promise<any> => {
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

    public attesterSignUp = async (): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.attesterSignUp()
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    public attesterSignUpViaRelayer = async (attesterAddr: string, signature: string): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.attesterSignUpViaRelayer(attesterAddr, signature)
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    public setAirdropAmount = async (airdropAmount: number | BigInt): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.setAirdropAmount(airdropAmount)
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    public submitEpochKeyProof = async(epochKeyProof: BigInt[] | string[]): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        } else {
            console.log("Error: shoud connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.submitEpochKeyProof(epochKeyProof)
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    public getEpochKeyProofIndex = async (epochKeyProof: any[]): Promise<any> => {
        const proofNullifier = await this.contract.hashEpochKeyProof(epochKeyProof)
        return this.contract.getProofIndex(proofNullifier)
    }

    public getReputationProofIndex = async (reputationProof: any[]): Promise<any> => {
        const proofNullifier = await this.contract.hashReputationProof(reputationProof)
        return this.contract.getProofIndex(proofNullifier)
    }

    public getSignUpProofIndex = async (signUpProof: any[]): Promise<any> => {
        const proofNullifier = await this.contract.hashSignUpProof(signUpProof)
        return this.contract.getProofIndex(proofNullifier)
    }

    public getStartTransitionProofIndex = async (
        blindedUserState: BigInt | string,
        blindedHashChain: BigInt | string,
        GSTreeRoot: BigInt | string,
        proof: BigInt[] | string[]
    ): Promise<any> => {
        const proofNullifier = await this.contract.hashStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            GSTreeRoot,
            formatProofForVerifierContract(proof)
        )
        return this.contract.getProofIndex(proofNullifier)
    }

    public getProcessAttestationsProofIndex = async (
        outputBlindedUserState: BigInt | string,
        outputBlindedHashChain: BigInt | string,
        inputBlindedUserState: BigInt | string,
        proof: BigInt[] | string[]
    ): Promise<any> => {
        const proofNullifier = await this.contract.hashProcessAttestationsProof(
            outputBlindedUserState,
            outputBlindedHashChain,
            inputBlindedUserState,
            formatProofForVerifierContract(proof),
        )
        return this.contract.getProofIndex(proofNullifier)
    }

    public submitAttestation = async (attestation: IAttestation, epochKey: BigInt | string, proofIndex: BigInt | string): Promise<any> => {
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
                proofIndex,
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

    public submitAttestationViaRelayer = async (attesterAddr: string, signature: string, attestation: IAttestation, epochKeyProof: BigInt[] | string[]): Promise<any> => {
        if(this.signer != undefined){
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
            tx = await this.contract.submitAttestationViaRelayer(
                attesterAddr,
                signature,
                attestation,
                epochKeyProof,
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

    public spendReputation = async (
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
    ): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const signerAttesterId = await this.getAttesterId()
        if(signerAttesterId != attesterId) {
            console.log("Error: wrong attester ID proof")
            return
        }
        const attestingFee = await this.contract.attestingFee()
        let tx
        try {
            tx = await this.contract.spendReputation([
                outputNullifiers,
                epoch,
                epk,
                GSTRoot,
                attesterId,
                repNullifiersAmount,
                minRep,
                proveGraffiti,
                graffitiPreImage,
                proof
                ],{ value: attestingFee, gasLimit: 1000000 }
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

    public airdropEpochKey = async(
        epoch: number | BigInt | string,
        epk: number | BigInt | string,
        GSTRoot: BigInt | string,
        attesterId: number | BigInt | string,
        proof: any,
    ): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        const attestingFee = await this.contract.attestingFee()
        let tx
        try {
            tx = await this.contract.airdropEpochKey([
                epoch,
                epk,
                GSTRoot,
                attesterId,
                proof
                ],{ value: attestingFee, gasLimit: 1000000 }
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

    public fastForward = async() => {
        const epochLength = (await this.contract.epochLength()).toNumber()
        await this.provider.send("evm_increaseTime", [epochLength])
    }

    public epochTransition = async (): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.beginEpochTransition({ gasLimit: 9000000 })
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
            return
        }
        return tx
    }

    public startUserStateTransition = async (blindedUserState: BigInt | string, blindedHashChain: BigInt | string, GSTRoot: BigInt | string, proof: any): Promise<any> => {
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

    public processAttestations = async (outputBlindedUserState: BigInt | string, outputBlindedHashChain: BigInt | string, inputBlindedUserState: BigInt | string, proof: any): Promise<any> => {
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

    public updateUserStateRoot = async ( 
        newGSTLeaf: BigInt | string, 
        epochKeyNullifiers: BigInt[] | string[],
        blindedUserStates: BigInt[] | string[],
        blindedHashChains: BigInt[] | string[],
        transitionedFromEpoch: BigInt | number | string,
        fromGSTRoot: BigInt | string,
        fromEpochTree: BigInt | string,
        proof: any,
        proofIndexes: BigInt[] | string [],
    ): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.updateUserStateRoot([
                newGSTLeaf,
                epochKeyNullifiers,
                transitionedFromEpoch,
                blindedUserStates,
                fromGSTRoot,
                blindedHashChains,
                fromEpochTree,
                formatProofForVerifierContract(proof),
            ], proofIndexes)
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }
        return tx
    }

    public verifyEpochKeyValidity = async (
        GSTRoot: BigInt,
        currentEpoch: number,
        epk: BigInt,
        proof: any,
    ): Promise<boolean> => {
        return this.contract.verifyEpochKeyValidity(
            GSTRoot,
            currentEpoch,
            epk,
            proof,
        )
    }

    public verifyStartTransitionProof = async (
        blindedUserState: BigInt | string,
        blindedHashChain: BigInt | string,
        GSTRoot: BigInt | string,
        proof: any,
    ): Promise<boolean> => {
        return this.contract.verifyStartTransitionProof(
            blindedUserState,
            blindedHashChain,
            GSTRoot,
            proof,
        )
    }

    public verifyProcessAttestationProof = async (
        outputBlindedUserState: BigInt | string,
        outputBlindedHashChain: BigInt | string,
        intputBlindedUserState: BigInt | string,
        proof: any,
    ): Promise<boolean> => {
        return this.contract.verifyProcessAttestationProof(
            outputBlindedUserState,
            outputBlindedHashChain,
            intputBlindedUserState,
            proof,
        )
    }

    public verifyUserStateTransition = async (
        newGSTLeaf: BigInt | string,
        epkNullifiers: BigInt[] | string[],
        fromEpoch: number | BigInt | string,
        blindedUserStates: BigInt[] | string[],
        fromGlobalStateTree: BigInt | string,
        blindedHashChains: BigInt[] | string[],
        fromEpochTree: BigInt | string,
        proof: any,
    ): Promise<boolean> => {
        return this.contract.verifyUserStateTransition(
            newGSTLeaf,
            epkNullifiers,
            fromEpoch,
            blindedUserStates,
            fromGlobalStateTree,
            blindedHashChains,
            fromEpochTree,
            proof,
        )
    }

    public verifyReputation = async (
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
    ): Promise<boolean> => {
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

    public verifyUserSignUp = async (
        epoch: number | BigInt | string,
        epk: number | BigInt | string,
        GSTRoot: BigInt | string,
        attesterId: number | BigInt | string,
        proof: any,
    ): Promise<boolean> => {
        return this.contract.verifyUserSignUp(
            epoch,
            epk,
            GSTRoot,
            attesterId,
            proof,
        )
    }

    public hashedBlankStateLeaf = async (): Promise<any> => {
        return this.contract.hashedBlankStateLeaf()
    }

    public calcAirdropUSTRoot = async (leafIndex: number | BigInt, leafValue: BigInt | string): Promise<any> => {
        return this.contract.calcAirdropUSTRoot(leafIndex, leafValue)
    }

    public burnAttestingFee = async (): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.burnAttestingFee()
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }
        return tx
    }

    public collectEpochTransitionCompensation = async (): Promise<any> => {
        if(this.signer != undefined){
            this.contract = this.contract.connect(this.signer)
        }
        else{
            console.log("Error: should connect a signer")
            return
        }
        let tx
        try {
            tx = await this.contract.collectEpochTransitionCompensation()
        } catch(e) {
            console.error('Error: the transaction failed')
            if (e) {
                console.error(e)
            }
        }
        return tx
    }

    public verifyProcessAttestationEvents = async (startBlindedUserState: BigInt | string, currentBlindedUserState: BigInt | string): Promise<boolean> => {
        const processAttestationFilter = this.contract.filter.ProcessedAttestationsProof(currentBlindedUserState)
        const processAttestationEvents = await this.contract.queryFilter(processAttestationFilter)
        if(processAttestationEvents.length == 0) return false

        let returnValue = false
        for(const event of processAttestationEvents){
            const args = event?.args
            const isValid = await this.contract.verifyProcessAttestationProof(
                args?._outputBlindedUserState,
                args?._outputBlindedHashChain,
                args?._inputBlindedUserState,
                args?._proof
            )
            if(!isValid) continue
            if (args?._inputBlindedUserState == startBlindedUserState) returnValue = true
            else {
                returnValue = returnValue || await this.verifyProcessAttestationEvents(startBlindedUserState, args?._inputBlindedUserState)
            }
        }
        return returnValue
    }
}