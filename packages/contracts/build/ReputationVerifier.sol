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

pragma solidity ^0.8.0;

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

contract ReputationVerifier {

    using Pairing for *;

    uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct VerifyingKey {
        Pairing.G1Point alpha1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[19] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alpha1 = Pairing.G1Point(uint256(20491192805390485299153009773594534940189261866228447918068658471970481763042),uint256(9383485363053290200918347156157836566562967994039712273449902621266178545958));
        vk.beta2 = Pairing.G2Point([uint256(4252822878758300859123897981450591353533073413197771768651442665752259397132),uint256(6375614351688725206403948262868962793625744043794305715222011528459656738731)], [uint256(21847035105528745403288232691147584728191162732299865338377159692350059136679),uint256(10505242626370262277552901082094356697409835680220590971873171140371331206856)]);
        vk.gamma2 = Pairing.G2Point([uint256(11559732032986387107991004021392285783925812861821192530917403151452391805634),uint256(10857046999023057135944570762232829481370756359578518086990519993285655852781)], [uint256(4082367875863433681332203403145435568316851327593401208105741076214120093531),uint256(8495653923123431417604973247489272438418190587263600148770280649306958101930)]);
        vk.delta2 = Pairing.G2Point([uint256(11559732032986387107991004021392285783925812861821192530917403151452391805634),uint256(10857046999023057135944570762232829481370756359578518086990519993285655852781)], [uint256(4082367875863433681332203403145435568316851327593401208105741076214120093531),uint256(8495653923123431417604973247489272438418190587263600148770280649306958101930)]);
        vk.IC[0] = Pairing.G1Point(uint256(11656274787988630045584145078682374528205764294972070091379563448965542359065),uint256(10667521755136968170870803225768488596556351013674715300717360228609621358267));
        vk.IC[1] = Pairing.G1Point(uint256(81669687207536517390126920717209766571603848629951281493351760387348546214),uint256(4765693040396719926938255944565594106634780005090270525761174210147668305173));
        vk.IC[2] = Pairing.G1Point(uint256(13135774355558945759874776591966995964689151134939368340555071307169431702262),uint256(8970212867210955324405049854604147155673656766997063247980750434325341774275));
        vk.IC[3] = Pairing.G1Point(uint256(15955208081035959488116751733769873610011760011053893406954575760523788369149),uint256(17307931230227616814291301041740527434682198522487346111156679420505693972358));
        vk.IC[4] = Pairing.G1Point(uint256(19162994655068657979543987846699930187810952178355388834072066230167708202647),uint256(4968105177164110846215567158092350701474038266141583365245296070056404199616));
        vk.IC[5] = Pairing.G1Point(uint256(6936455512167331573147857170644252636713559159434273277695307072848125155144),uint256(11046283522423772021143893889784330898203315934323302870346152852653037638168));
        vk.IC[6] = Pairing.G1Point(uint256(21488752897537947415685059276845102839598765915839290209347456964637953726117),uint256(230157873975144292872339675892638518259082707594363623568062798112395565878));
        vk.IC[7] = Pairing.G1Point(uint256(11551172914334637725201029741743592339289074324655507621774128476223096795169),uint256(7222410471620135262514729808274935537656196126899257676844132352264637044559));
        vk.IC[8] = Pairing.G1Point(uint256(10749856315524049585674164868975929725641212703960811989323816656039722387889),uint256(10821435243317523116864284322350030424177287296871937840819194460654837975605));
        vk.IC[9] = Pairing.G1Point(uint256(115696338963015664367996177822090448287845804046646301961514126375175879391),uint256(444003913422151685848462263005173327641197866457565710585531106918596705677));
        vk.IC[10] = Pairing.G1Point(uint256(11631247160319311165772277865429318494766426157452732751178075938935115070705),uint256(4239611128599522432939644837407255198930664960381497874363333309139544285473));
        vk.IC[11] = Pairing.G1Point(uint256(13021487059333992240381586479261273371703011734092907312194475557034164463822),uint256(7568816429218800362286101467149685616678864350555426030134410254322412343011));
        vk.IC[12] = Pairing.G1Point(uint256(8327897753391428157473926408105684425664795455511562662040379579144764124151),uint256(4949077720981488808146534716100460893606823206031237346625193044011534035205));
        vk.IC[13] = Pairing.G1Point(uint256(17877332036651858505772338220887602412495938069148179532288170743573125997569),uint256(21331839159704412369974079438206273488304128447042927826516261925497669266979));
        vk.IC[14] = Pairing.G1Point(uint256(16978426184037250279159406747588628536182424652506551349450673106604309624115),uint256(21271844842631960270039089059039887225180929180733638655254317146332968083334));
        vk.IC[15] = Pairing.G1Point(uint256(19035086395081498159929113678262412860140474446516594195090610397484293221919),uint256(6772782921594864934751854707546407700474445338587338473845534918687662596899));
        vk.IC[16] = Pairing.G1Point(uint256(5354041618953138871281950431379534458203917252093702702508055374196551746426),uint256(14196062255884130011784218690358502035848039538328257840122918968967618253951));
        vk.IC[17] = Pairing.G1Point(uint256(9254766192586510975612379990510977662342156812811252273881928084619685505985),uint256(8158867699379965650415798516833276091090812899991746670976597458378997201815));
        vk.IC[18] = Pairing.G1Point(uint256(13582916956833878710049391107635159243878259535058664840437217562236833659784),uint256(7583076668755272991348066472264769522214150734139645318781300225593594109011));

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
        for (uint256 i = 0; i < 18; i++) {
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