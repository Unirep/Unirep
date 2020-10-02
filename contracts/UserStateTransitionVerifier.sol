// Copyright 2017 Christian Reitwiessner
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// 2019 OKIMS

pragma solidity ^0.6.0;

library Pairing {

    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct G1Point {
        uint256 X;
        uint256 Y;
    }

    // Encoding of field elements is: X[0] * z + X[1]
    struct G2Point {
        uint256[2] X;
        uint256[2] Y;
    }

    /*
     * @return The negation of p, i.e. p.plus(p.negate()) should be zero. 
     */
    function negate(G1Point memory p) internal pure returns (G1Point memory) {

        // The prime q in the base field F_q for G1
        if (p.X == 0 && p.Y == 0) {
            return G1Point(0, 0);
        } else {
            return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
        }
    }

    /*
     * @return The sum of two points of G1
     */
    function plus(
        G1Point memory p1,
        G1Point memory p2
    ) internal view returns (G1Point memory r) {

        uint256[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-add-failed");
    }

    /*
     * @return The product of a point on G1 and a scalar, i.e.
     *         p == p.scalar_mul(1) and p.plus(p) == p.scalar_mul(2) for all
     *         points p.
     */
    function scalar_mul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {

        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require (success,"pairing-mul-failed");
    }

    /* @return The result of computing the pairing check
     *         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
     *         For example,
     *         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
     */
    function pairing(
        G1Point memory a1,
        G2Point memory a2,
        G1Point memory b1,
        G2Point memory b2,
        G1Point memory c1,
        G2Point memory c2,
        G1Point memory d1,
        G2Point memory d2
    ) internal view returns (bool) {

        G1Point[4] memory p1 = [a1, b1, c1, d1];
        G2Point[4] memory p2 = [a2, b2, c2, d2];

        uint256 inputSize = 24;
        uint256[] memory input = new uint256[](inputSize);

        for (uint256 i = 0; i < 4; i++) {
            uint256 j = i * 6;
            input[j + 0] = p1[i].X;
            input[j + 1] = p1[i].Y;
            input[j + 2] = p2[i].X[0];
            input[j + 3] = p2[i].X[1];
            input[j + 4] = p2[i].Y[0];
            input[j + 5] = p2[i].Y[1];
        }

        uint256[1] memory out;
        bool success;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
            // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }

        require(success,"pairing-opcode-failed");

        return out[0] != 0;
    }
}

contract UserStateTransitionVerifier {

    using Pairing for *;

    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct VerifyingKey {
        Pairing.G1Point alpha1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[18] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alpha1 = Pairing.G1Point(uint256(15047834382018739956535473943148476547243519314661973017913689449110211449431),uint256(18000012274909993269057916280799156259460576284099317383942961333915551975334));
        vk.beta2 = Pairing.G2Point([uint256(13940109493584531659669783362508895548621774739169202121719077863264454759281),uint256(12691155147106729050140250322233044307795285690539414213756507725596150392982)], [uint256(6219255921572867725647501769878130907258597002553177204204174589571113275997),uint256(19272618716718298245526146148100317158503180222592607435068337732783180573692)]);
        vk.gamma2 = Pairing.G2Point([uint256(19351906494070765181147020928671357989090635295969363174667613631912325975806),uint256(21143644659749236606230304541957189669562214351618382683805990715938501082181)], [uint256(2933110038006259089388692226214595823309043344652078182979793343650554115056),uint256(771817523694119551004255588542913655310544722818486604985773961670195928555)]);
        vk.delta2 = Pairing.G2Point([uint256(20059955072081903021678643916939896229060566876314678325213567534468968929165),uint256(9978572856197478858654217813497283437409856580080766452686033802623915427449)], [uint256(918871136329389056702329227146897563889477546044385113153180589424226123155),uint256(3447135488295616367011440657569552156347287837468556919315820136327864589537)]);
        vk.IC[0] = Pairing.G1Point(uint256(7839094815233676567291793249975651098271192057511747055839670566934625563734),uint256(13921016830848233753120902275784209228977591646817213250900552339752453428607));
        vk.IC[1] = Pairing.G1Point(uint256(8475641151414566091105145249670795860091699887053547839163893564775014382354),uint256(8816401585434600549021275168097459172733088538917176079211275204850218166898));
        vk.IC[2] = Pairing.G1Point(uint256(8250937240318273407989733836441414462634261972552543983565499624218358051044),uint256(21055424689361606621614072472962568874387709576452625213757517700315366346752));
        vk.IC[3] = Pairing.G1Point(uint256(3271797693414762024742349423022632521748874667659863942865280993517111051533),uint256(21040396488321705217636212532850987816105142696365852345900937141880821317063));
        vk.IC[4] = Pairing.G1Point(uint256(1547410129613140428668146823535824731031877288703918335573314190686397535495),uint256(5357818548632940658570104275637393042432992549221052030249703532755219416166));
        vk.IC[5] = Pairing.G1Point(uint256(21403406659160323476455238086517914075620763223410790472943433439121824136437),uint256(18898690524727954744430492991099577849942772840875841711515938739665108114831));
        vk.IC[6] = Pairing.G1Point(uint256(1407314684373261186461228090730257236904769921154568835680669904413370946118),uint256(7902895576788102393470553573468102519732189374354028815547496535944711848105));
        vk.IC[7] = Pairing.G1Point(uint256(8084192562205896750482159106165257003147399050269717357354801689129230119258),uint256(15551150705693723723185801384471211959722808267732031891898583309973211803762));
        vk.IC[8] = Pairing.G1Point(uint256(3059266970118055651073193093939208801059130736292559535281597673407166561088),uint256(11625654411517998577485679075352773424839004287885028342902063241665839444435));
        vk.IC[9] = Pairing.G1Point(uint256(11351163888678886007977402656486845256159657260424647543936093054818038930685),uint256(3871402193220459134099116830577140191654658254341815994559540155757330324239));
        vk.IC[10] = Pairing.G1Point(uint256(34866068118780459923402225964566392728728815905513436545327975689241278059),uint256(17829915944208741947621386052302860189794464429125378233065394649777089768628));
        vk.IC[11] = Pairing.G1Point(uint256(14600579556819981089426048539200257096539060703451553807064440540382329789608),uint256(20270967602707483714733978957474645483003875109984450444453893741789237167317));
        vk.IC[12] = Pairing.G1Point(uint256(5601565701906039259059173763036696672358430570169730979231026330972952908663),uint256(14000337128393652438829324340123640439608970549773717411447827142709803311934));
        vk.IC[13] = Pairing.G1Point(uint256(8448106412162913151633756878061292550534353533733899538385050651381343292472),uint256(19340684243227689672330819005907983689550809588870481995991460553343247549435));
        vk.IC[14] = Pairing.G1Point(uint256(13259980795549806727204346614547534296486537026953168330771144819718530858891),uint256(8684715991072768372006632916726969025991618453520463618151212521904691206027));
        vk.IC[15] = Pairing.G1Point(uint256(16114443793049911067899690319971376006653992644479311730521568699583982513462),uint256(4550218652062756285667852519261690737120362454685234254071725489996884807652));
        vk.IC[16] = Pairing.G1Point(uint256(4429780054840725031103944547086883616116774216893897796870661251045707297028),uint256(19741629315866106703968889150219560137144602619890396908558268898580932343617));
        vk.IC[17] = Pairing.G1Point(uint256(2080826220724419817214140200138947475734591697093654702741920521144813951316),uint256(10407443156965535976984158906384920185425928895263094602348064363821056993252));

    }
    
    /*
     * @returns Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) public view returns (bool) {

        Proof memory proof;
        proof.A = Pairing.G1Point(a[0], a[1]);
        proof.B = Pairing.G2Point([b[0][0], b[0][1]], [b[1][0], b[1][1]]);
        proof.C = Pairing.G1Point(c[0], c[1]);

        VerifyingKey memory vk = verifyingKey();

        // Compute the linear combination vk_x
        Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);

        // Make sure that proof.A, B, and C are each less than the prime q
        require(proof.A.X < PRIME_Q, "verifier-aX-gte-prime-q");
        require(proof.A.Y < PRIME_Q, "verifier-aY-gte-prime-q");

        require(proof.B.X[0] < PRIME_Q, "verifier-bX0-gte-prime-q");
        require(proof.B.Y[0] < PRIME_Q, "verifier-bY0-gte-prime-q");

        require(proof.B.X[1] < PRIME_Q, "verifier-bX1-gte-prime-q");
        require(proof.B.Y[1] < PRIME_Q, "verifier-bY1-gte-prime-q");

        require(proof.C.X < PRIME_Q, "verifier-cX-gte-prime-q");
        require(proof.C.Y < PRIME_Q, "verifier-cY-gte-prime-q");

        // Make sure that every input is less than the snark scalar field
        //for (uint256 i = 0; i < input.length; i++) {
        for (uint256 i = 0; i < 17; i++) {
            require(input[i] < SNARK_SCALAR_FIELD,"verifier-gte-snark-scalar-field");
            vk_x = Pairing.plus(vk_x, Pairing.scalar_mul(vk.IC[i + 1], input[i]));
        }

        vk_x = Pairing.plus(vk_x, vk.IC[0]);

        return Pairing.pairing(
            Pairing.negate(proof.A),
            proof.B,
            vk.alpha1,
            vk.beta2,
            vk_x,
            vk.gamma2,
            proof.C,
            vk.delta2
        );
    }
}