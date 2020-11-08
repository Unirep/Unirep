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
        Pairing.G1Point[20] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alpha1 = Pairing.G1Point(uint256(10394167268416702355684763950699378183970703222919745518541618558308519836820),uint256(12233536213350584336365272108019611051857372840823384549517214130447880296017));
        vk.beta2 = Pairing.G2Point([uint256(15955796845277768194041355362390176222854692095340781565807188721334152547634),uint256(1914624489269681525162094269406958820032470501019798321185286562940899441517)], [uint256(5247196861572793997069924469940157417567647212444571511086713013590780472233),uint256(11802308523585124578523412322497604844990121794907378051615337472310261639315)]);
        vk.gamma2 = Pairing.G2Point([uint256(587342571032736686467478591361097796675966131245670076719146430798546854197),uint256(13714625469731356367191022771327878680685870844418277732442122052664357637036)], [uint256(13785598072636868794210860302827765853395073858525876150023603332050030186747),uint256(2564383187153844287964710779461447836927073527906876539915015963829685878794)]);
        vk.delta2 = Pairing.G2Point([uint256(15475379093373988834515249285023694484436583524542556242259155765514874026627),uint256(5598944424260904269418451330834996577153791758240619906625870379164464383290)], [uint256(7291162271544113624326576403328416864739974254677579316131860450524858893643),uint256(7244888877249951595488315711311187256363219070755516425037829220539783896647)]);
        vk.IC[0] = Pairing.G1Point(uint256(11902901426132451611288985119003263516242855129803869481225963946419443494670),uint256(11380111603294376709564366728785955784204922061729627120097672731760342371626));
        vk.IC[1] = Pairing.G1Point(uint256(14241578908346748185856787676363596789855288248469087588054964990010846804333),uint256(19556875499355960123355139346200842837793494830646219960030465382447120631392));
        vk.IC[2] = Pairing.G1Point(uint256(17755217796816663715119628026873209225406174993268608779597956026392695180512),uint256(21084500092793251731353404663065555219926040882144546705926474995489621431941));
        vk.IC[3] = Pairing.G1Point(uint256(12749916497004045036632956492406908058371764401704110956399223027058078236528),uint256(18350534525118927986622962339301293989017790335811477733701584849729948883455));
        vk.IC[4] = Pairing.G1Point(uint256(17491688362531140094605619538008470972584008298327019661867477281976190603139),uint256(15998502195033877851620932720104940545164894843607345576266357947700082388580));
        vk.IC[5] = Pairing.G1Point(uint256(4913453147289957581302219323185584432934242071533072137206484554027377147578),uint256(17805803039231389615070544077781357383117693401262815936830323884787867211798));
        vk.IC[6] = Pairing.G1Point(uint256(10314809746776650865819758411834883849513037262335531372124294535781125219987),uint256(13290420792091016394705041434365730147419794990661849673888654174483243013094));
        vk.IC[7] = Pairing.G1Point(uint256(17502883862984464283251543093208534035631001210608501534410617319211637353994),uint256(4706021091921214817571984065721334819787489373763145825294565898916144143313));
        vk.IC[8] = Pairing.G1Point(uint256(16738959530332564761957728290279703741569530929264565678615257792304629938325),uint256(10926689273023784772878627452173687889888856281352342562582868090579740248678));
        vk.IC[9] = Pairing.G1Point(uint256(8101509500635449207207017028243822171442702465683989666728736265045521653013),uint256(14087284094086190922785630040817748523260860756860867656110510921780918963673));
        vk.IC[10] = Pairing.G1Point(uint256(3164585273222565927646686913580232051593995477708065269929364902897944984527),uint256(6231941618563388225093615634805928717471289166583265980705158275626758419098));
        vk.IC[11] = Pairing.G1Point(uint256(11267874524264540311763341746780583466328637035674066687109358814666006549329),uint256(5887792898143965325036082580057070435790074064561597262080586714054478511013));
        vk.IC[12] = Pairing.G1Point(uint256(20106848173499731872496507455367648430687352962350744519198595423549864942756),uint256(19126117018012784878109215841165552871210314630923490178349714406390385052865));
        vk.IC[13] = Pairing.G1Point(uint256(19199182333822007912166601076826595793532784110466852428718775085492338900420),uint256(9660793657861363146163055336744868560135215105323274868995823491226024351006));
        vk.IC[14] = Pairing.G1Point(uint256(1881559308737599915729673995860930234793483074689361547536212955343868685462),uint256(17065342596126308093950414620765046667817908319608188711302945790552952509251));
        vk.IC[15] = Pairing.G1Point(uint256(16685673886812153274065519232752357579170424976930531882048999265593983906442),uint256(11691432198268574884712688514684544510383702861073092591674485504533439744305));
        vk.IC[16] = Pairing.G1Point(uint256(1942878211202386947660934949772107412141188355031571407500154501515171180354),uint256(21496023124328890394143558790098328405814144420329609850462445656374090124370));
        vk.IC[17] = Pairing.G1Point(uint256(11122154892555467354707577366533684307150613977114802456204145114231469587655),uint256(10652718674971579571469869970220118993804578894572957262792282882301593910534));
        vk.IC[18] = Pairing.G1Point(uint256(8012230154941108426364365830332837046645611121588358454207052550410019790783),uint256(342536708372883654475016342461759884761937327457432012420340059813697254570));
        vk.IC[19] = Pairing.G1Point(uint256(12198325494871930574889573369342865682137363456274955325491497156759083615790),uint256(391811084768537793974168000620020941308010422661857526465940031350555738759));

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
        for (uint256 i = 0; i < 19; i++) {
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