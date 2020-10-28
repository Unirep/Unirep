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
        vk.alpha1 = Pairing.G1Point(uint256(433587831585813339338707239582557622091652093153401280501111299780682981959),uint256(20425058007721531566534932055861196610435006867346959894813448263558414662482));
        vk.beta2 = Pairing.G2Point([uint256(8169195388296123862884359193759612360162354916250215480950884237883474188710),uint256(8679406306160788737000340147345325519569225530070525538672095695262160213328)], [uint256(5529228293862198569198561432557324520514360092793254198156937249653605376090),uint256(10357719430076824484306393667625890557967763227442282254715631241080429107209)]);
        vk.gamma2 = Pairing.G2Point([uint256(16091343943630543911001566716455615554774920916054353495853286097891062933962),uint256(9845961333878760898981104837453400601622965562385873464548274886928609568649)], [uint256(9882799075169819392521920194218664794956891314854257294061704761643123389071),uint256(13780866559072680179704773230177513996974065127715699653550856231378591918973)]);
        vk.delta2 = Pairing.G2Point([uint256(9651538346756849748893266368955232276236552992306613633015914363466934583525),uint256(7759039746773840648969370653353223280267996834840920774611929396055395474009)], [uint256(20895980270584267097577980086675887132583495984987169431168618018586679718023),uint256(8685516935659091486627570776425211095547852448637979668350138251702886459745)]);
        vk.IC[0] = Pairing.G1Point(uint256(15614442409424780758316984411284948666750835947001839189141981734471736379722),uint256(2841694807741426184320901231563042083237552333161080376695104338533144362960));
        vk.IC[1] = Pairing.G1Point(uint256(2685591696118161128401353353698688227001286641203671405409051742871745761259),uint256(2210856531316349236819219338452666000504762379671692198617716951377653155089));
        vk.IC[2] = Pairing.G1Point(uint256(4693023436872895991032430172902485616505941081000780481069310956182431137171),uint256(15976153590756555952886196702386386066878648236259416190304814433644943658274));
        vk.IC[3] = Pairing.G1Point(uint256(14808803571721982944782516506247695917658207968885455445907378024979712165921),uint256(21002405719853764413608367745042008291394859350159771905063510963010712530817));
        vk.IC[4] = Pairing.G1Point(uint256(332479919503992483309737849965254828268918656488513786799650932874999167780),uint256(12302825601329162139131027525486610318174628161128177847474323086252680260590));
        vk.IC[5] = Pairing.G1Point(uint256(1980176920809857126597647583771138413755076487274114103193595484092859439661),uint256(898906762817456733210630555216436705284548525286666212798984730896940205227));
        vk.IC[6] = Pairing.G1Point(uint256(7567690835841419658569338839099835327356427291250920967515626547550703403187),uint256(18913359281827700347694127662485109298046236930449725438647287132882960411920));
        vk.IC[7] = Pairing.G1Point(uint256(15225665024025317502972958167038651773899606875998919885665600457602039884218),uint256(17050815771999697658267100252143610646454626043807853005449292965317693390798));
        vk.IC[8] = Pairing.G1Point(uint256(16911226525708619852596147866897868650021749726824631336759803422631505710200),uint256(19447503217967932552840268469551059379548080358010621842817279828809144656164));
        vk.IC[9] = Pairing.G1Point(uint256(16541506555107925343700580548386216830500611246784416836747678462960969640209),uint256(9451368187485743344169417686920254671870009775248240522837524206625009601359));
        vk.IC[10] = Pairing.G1Point(uint256(93537150495696255828394941123089762108096944453711911487232330876367765580),uint256(20614409876173968516333684086532175316504189993601152486285787464173986967938));
        vk.IC[11] = Pairing.G1Point(uint256(7977643865177959039127624284666177472323591696617933776865331082502048815496),uint256(8649386138175213845599963853498600848060923591110473667136488463129519011389));
        vk.IC[12] = Pairing.G1Point(uint256(10984252353145047224654968725481213545259227787786736664583239513790931053586),uint256(8253285089786201852768878522742118065992368906644631670437921775417172502000));
        vk.IC[13] = Pairing.G1Point(uint256(14113405494099615487559096548203691459298876089215400858538891338617842999652),uint256(2099540845523287645287880391606069186553099135279457983127507570949808572642));
        vk.IC[14] = Pairing.G1Point(uint256(1764712365156546461441638259160295344864107714776365239515212601491922249237),uint256(19649799852825291135308395946625283969873062625861363351833806388003355646234));
        vk.IC[15] = Pairing.G1Point(uint256(17291140469602825522807779855993696552308022694321358513806029189566276880860),uint256(16682879397287932071389446436789217747863128287289716860458567607195384423861));
        vk.IC[16] = Pairing.G1Point(uint256(2496554160769710347566731888453209368274693941870833670871091776522794780400),uint256(8711016799249799228599752934363712571521323928635856752358999418180041184734));
        vk.IC[17] = Pairing.G1Point(uint256(2000799103460202522138678188275233104676616592329318153054639133633725769038),uint256(16627101148564547914489973136325910384281147533362297737763143654379291202231));

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