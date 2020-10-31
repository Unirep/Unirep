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
        Pairing.G1Point[17] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alpha1 = Pairing.G1Point(uint256(2879693682681150381487855907382531906920613718506090512724071584817016743821),uint256(18943284440046175243200940133427491281689195626889260784919246266324197216213));
        vk.beta2 = Pairing.G2Point([uint256(5802793410130779392473427186477675772450033542281273991775798490030457521833),uint256(13554721244102255549124170946004068025833066592086033553438974390165222592944)], [uint256(4514593483662769557873464976893893249232822084718551464774470492633014722555),uint256(4792466329700635992873063904855947847208945801464786928466516069038523589498)]);
        vk.gamma2 = Pairing.G2Point([uint256(11446014563420324682095970162435770352611230082782719938167879358658850566818),uint256(18986791399702254075195423641544800699466901213595631607730097901312948494790)], [uint256(5731707884723064598511719087877031221681463172056430732165053813663667514883),uint256(13180241535667130626552485040248421123354125373237326098324343337114706375107)]);
        vk.delta2 = Pairing.G2Point([uint256(886656387173949237875430112978875883781955563229610473706035462053172253271),uint256(10622399429403736575223059613572377832477594854284243863504910426087761991610)], [uint256(19258451847273590536977297160521300729923622911519085442595254283931427923474),uint256(7181780039034465566604882590766314417246210510523903788211556274429230118590)]);
        vk.IC[0] = Pairing.G1Point(uint256(6157779347845529754028619838704673747658753036771444488226885789111601845573),uint256(14152092562785161243000649547616208593888839897404698892868478709442993493846));
        vk.IC[1] = Pairing.G1Point(uint256(16118526365576366477884207234919398155181475883622890305050925766785617800725),uint256(2280758737461765843131423198136903349582264825291982959545978563310225552145));
        vk.IC[2] = Pairing.G1Point(uint256(16207399947558935192252488680619557212615740440258433087191718652195633930581),uint256(4482288960475538007840774360351408430353978498060822865812540173654568768869));
        vk.IC[3] = Pairing.G1Point(uint256(14851318925656855627466897078332725895786688407579045105590352602074880276292),uint256(13167628583171860072394523967448349897949440314416122325807828242414097981396));
        vk.IC[4] = Pairing.G1Point(uint256(14662265698254837180279037495032873574247089738912906095151923419489353830304),uint256(13292851457958299302615608869837326967729544225391195215516698791086400163714));
        vk.IC[5] = Pairing.G1Point(uint256(7940646957532734171443499257044044871454943134238177030290964332043802857449),uint256(7818625671916708493997995543864052539444866865308942519199506184626171198673));
        vk.IC[6] = Pairing.G1Point(uint256(2702748031430967137494063591651078716811774090275638752729471911306593605715),uint256(21393267241098768194562287386373080020322615192438230308815444800051892100713));
        vk.IC[7] = Pairing.G1Point(uint256(9991112300121519414443779585810399107638795230393668125565323451366555281691),uint256(1298929212855687112096915786640185884718463628668531102541972177762719798800));
        vk.IC[8] = Pairing.G1Point(uint256(7248009036649844616420569255405350696253874474301738417838466893900563486069),uint256(5786659065266223018992238624642241475993710752562217691336531167431560391472));
        vk.IC[9] = Pairing.G1Point(uint256(20578708520711986994897075496703715623041511834588147751448724320284039414671),uint256(15948293094980639506829500002584199548481076673904327664130442062847286510687));
        vk.IC[10] = Pairing.G1Point(uint256(11812273761913526614154373026111878180544008621941966153404162207031334686866),uint256(19728741375710944973486747213717478876737112802878065407693502894620926480779));
        vk.IC[11] = Pairing.G1Point(uint256(3858819589723338100036305573562097658281011875462860495550565375667371164380),uint256(8679831185240200291191815774688789510902303590220886993399090646534025045268));
        vk.IC[12] = Pairing.G1Point(uint256(1122736674916331642237098139700022607570762408559226848155948773263611244936),uint256(4224175738426091418887606397629329564272563290097788704736290163928130259981));
        vk.IC[13] = Pairing.G1Point(uint256(9466786803863919023398392326669867153932176226062791701133199954942536949014),uint256(21166467473755963365636330664991153703169679187698371171035388385842348509379));
        vk.IC[14] = Pairing.G1Point(uint256(10509096713744590859046049600927777156085127976771038045305073092149676148639),uint256(17763383084060841551807263799033673602735270391348804216886864921110007708271));
        vk.IC[15] = Pairing.G1Point(uint256(2052686215564185346345116334462673577586077690605721531047855361197817872435),uint256(10930399901794562305668890807061490823190300132518856235758177962479779300379));
        vk.IC[16] = Pairing.G1Point(uint256(13811447769190773464192316867260458912615573864498682446237395674270539544454),uint256(17915905855131263724308633561168623885702339283211945499398016961036465292706));

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
        for (uint256 i = 0; i < 16; i++) {
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