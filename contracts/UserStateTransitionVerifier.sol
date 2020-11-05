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
        vk.alpha1 = Pairing.G1Point(uint256(1395384754302904483943058128571180749488947387124473829679882288574327634376),uint256(17242803911484005341066309707739210246670429821010995908781545408497649242427));
        vk.beta2 = Pairing.G2Point([uint256(10737547249460089697849568742963511710909884809615464291815470354867923796943),uint256(21726515626793063872905757799281667941648611894331550644516349898758837992263)], [uint256(21763000720785294690509785368912055866299650667826599427654968969245116194648),uint256(11426343891786963759233579998747306299068430620769690361945891437514271254914)]);
        vk.gamma2 = Pairing.G2Point([uint256(19777091168706284608566668303835471815154056876180182843182373025862590352310),uint256(12863749131116045361283738568368656772687535152427471361922302168861754743515)], [uint256(11165766090831255225395958413592537368182970607946167459136954488153770728988),uint256(4101773801426857578274790577901765223676262818667794836301542918336593961301)]);
        vk.delta2 = Pairing.G2Point([uint256(1184726586674298260990436504120146969080848570073055439612237913223728642403),uint256(6612427308417660934199658540890107440293690359198073423444285127042855018048)], [uint256(6883120290204787293961586204429769377346458926866083539416794604385777583403),uint256(15417574149126476752517433126877326099129486547603572180819657374277013823261)]);
        vk.IC[0] = Pairing.G1Point(uint256(19355442774280936254083834611410369191959850530445394983315743563228279407196),uint256(15640073792201261497260207906860791738912920690977464801511365664079821080222));
        vk.IC[1] = Pairing.G1Point(uint256(8722448030088222774594272642856251283056995873198483895618899127906704554267),uint256(4324738575039956562031611095100146393720921767920228866754645470836257652933));
        vk.IC[2] = Pairing.G1Point(uint256(544067059709273213717621150619685793059900586897783643419995698252262406455),uint256(13918264940818333906963217629742802236551585031302311810293228205319535415934));
        vk.IC[3] = Pairing.G1Point(uint256(3736241156058216283331141515379759703641459375094839704766634242158411920232),uint256(3540236492461717052781832293194212684548331908374369875423112025002377446144));
        vk.IC[4] = Pairing.G1Point(uint256(14033159764209149673124646930111078796397395029026333102503390636995518138217),uint256(20217731863756325825166458668901494722390735567764379014453346779418911783829));
        vk.IC[5] = Pairing.G1Point(uint256(11452513794959622566803997635578784249633721649078391711876211856219740810380),uint256(6843802895482591238056796906686628161973216984728809518196378284433463554289));
        vk.IC[6] = Pairing.G1Point(uint256(8960987779870224929032457269546821944328521988350897856619550945083062354342),uint256(7749834951321776690131805079731217442328832451678817454753381196770982939298));
        vk.IC[7] = Pairing.G1Point(uint256(13030046288183971042597878151683996088835399988954991329475923653999388309881),uint256(5856017273388457515524734246006954410168260612270879181633151747415502705287));
        vk.IC[8] = Pairing.G1Point(uint256(11567950840580757897657636369403062300173988641242728852674475759453149104206),uint256(10154441960642254039504761440385502806656760310961716205464787419588136637909));
        vk.IC[9] = Pairing.G1Point(uint256(3419360533784764473897197670006221278964627859817073744064249885334156452508),uint256(129631494456432546808068978174821487063070765267189953704861079053015997304));
        vk.IC[10] = Pairing.G1Point(uint256(3502032010116353502354172161247812114962744115969963611263216267576451668448),uint256(8096948684984803052552408762214273411008498752275693945237517676079834169291));
        vk.IC[11] = Pairing.G1Point(uint256(9320543473362010393025701790503674843036888246720591733910167562446846325549),uint256(11917477221355751149894797812995035176280344759282639695071452751676207680024));
        vk.IC[12] = Pairing.G1Point(uint256(15327442466038837486353962455859837067077638264392544182285062291016135683642),uint256(15780171454741576227115399447508361220337266236303076004127256121592157801042));
        vk.IC[13] = Pairing.G1Point(uint256(18908513363447818261333507011484795231045746968463716304129741947533307188431),uint256(20153720291216944496575188331945962751186511251225178297176998461533166926179));
        vk.IC[14] = Pairing.G1Point(uint256(7967133575212197551957756534007466147133264838540311065973690004910193809188),uint256(8707706940202658826765635160209869609026738994628406819572413818203180139201));
        vk.IC[15] = Pairing.G1Point(uint256(9300423439253533678016129712601412249445737385778838765445835279023798344029),uint256(1349460378527842964848995739059356703873764091758884216954757717878333690022));
        vk.IC[16] = Pairing.G1Point(uint256(12217684824277192094720351693772145471909996630439891342580160520476394943940),uint256(8902939467238274888060443815037753458558897288210870792495366413849103212796));
        vk.IC[17] = Pairing.G1Point(uint256(3092364622741943615312577484483107615420546719681127209154353689228792681645),uint256(21385343942139120138847921155443811459411336674667762553157831317958273926622));
        vk.IC[18] = Pairing.G1Point(uint256(14034031963424071103872071023442465863253151383480569703830943934421264579465),uint256(16502368937655510184433938635434188178569982982597938244101138723494572341868));
        vk.IC[19] = Pairing.G1Point(uint256(1045036043730532914061663942332223507043304807936327354339326043498397549673),uint256(39802699614457163984092010012649881672487403105932023059458068883510151725));

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