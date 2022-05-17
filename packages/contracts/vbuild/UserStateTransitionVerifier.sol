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
    uint256 constant PRIME_Q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

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
    function plus(G1Point memory p1, G1Point memory p2)
        internal
        view
        returns (G1Point memory r)
    {
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
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, 'pairing-add-failed');
    }

    /*
     * @return The product of a point on G1 and a scalar, i.e.
     *         p == p.scalar_mul(1) and p.plus(p) == p.scalar_mul(2) for all
     *         points p.
     */
    function scalar_mul(G1Point memory p, uint256 s)
        internal
        view
        returns (G1Point memory r)
    {
        uint256[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }
        require(success, 'pairing-mul-failed');
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
            success := staticcall(
                sub(gas(), 2000),
                8,
                add(input, 0x20),
                mul(inputSize, 0x20),
                out,
                0x20
            )
            // Use "invalid" to make gas estimation work
            switch success
            case 0 {
                invalid()
            }
        }

        require(success, 'pairing-opcode-failed');

        return out[0] != 0;
    }
}

contract UserStateTransitionVerifier {
    using Pairing for *;

    uint256 constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant PRIME_Q =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    struct VerifyingKey {
        Pairing.G1Point alpha1;
        Pairing.G2Point beta2;
        Pairing.G2Point gamma2;
        Pairing.G2Point delta2;
        Pairing.G1Point[13] IC;
    }

    struct Proof {
        Pairing.G1Point A;
        Pairing.G2Point B;
        Pairing.G1Point C;
    }

    function verifyingKey() internal pure returns (VerifyingKey memory vk) {
        vk.alpha1 = Pairing.G1Point(
            uint256(
                20491192805390485299153009773594534940189261866228447918068658471970481763042
            ),
            uint256(
                9383485363053290200918347156157836566562967994039712273449902621266178545958
            )
        );
        vk.beta2 = Pairing.G2Point(
            [
                uint256(
                    4252822878758300859123897981450591353533073413197771768651442665752259397132
                ),
                uint256(
                    6375614351688725206403948262868962793625744043794305715222011528459656738731
                )
            ],
            [
                uint256(
                    21847035105528745403288232691147584728191162732299865338377159692350059136679
                ),
                uint256(
                    10505242626370262277552901082094356697409835680220590971873171140371331206856
                )
            ]
        );
        vk.gamma2 = Pairing.G2Point(
            [
                uint256(
                    11559732032986387107991004021392285783925812861821192530917403151452391805634
                ),
                uint256(
                    10857046999023057135944570762232829481370756359578518086990519993285655852781
                )
            ],
            [
                uint256(
                    4082367875863433681332203403145435568316851327593401208105741076214120093531
                ),
                uint256(
                    8495653923123431417604973247489272438418190587263600148770280649306958101930
                )
            ]
        );
        vk.delta2 = Pairing.G2Point(
            [
                uint256(
                    11559732032986387107991004021392285783925812861821192530917403151452391805634
                ),
                uint256(
                    10857046999023057135944570762232829481370756359578518086990519993285655852781
                )
            ],
            [
                uint256(
                    4082367875863433681332203403145435568316851327593401208105741076214120093531
                ),
                uint256(
                    8495653923123431417604973247489272438418190587263600148770280649306958101930
                )
            ]
        );
        vk.IC[0] = Pairing.G1Point(
            uint256(
                7080480899032263066949660631232902214555651456318425743399448516863480954612
            ),
            uint256(
                2512618951447570867675557858310691834821285337008651694270493931491233089232
            )
        );
        vk.IC[1] = Pairing.G1Point(
            uint256(
                8696783500290809676309299313572553157273274027628366852588499271100396419513
            ),
            uint256(
                3861407185886974566016512071572053670258797517804401124512129931515298115622
            )
        );
        vk.IC[2] = Pairing.G1Point(
            uint256(
                18884939360667328387685313614605073718707553431827624249842867515686617033541
            ),
            uint256(
                7916335467579204185745004777222572608260351762298344516261510806266571012968
            )
        );
        vk.IC[3] = Pairing.G1Point(
            uint256(
                3850102955810090335460140347937496576213385904538562264950242230681846426779
            ),
            uint256(
                14660500760600868514149932756289944771226120411925641379519931571447341567787
            )
        );
        vk.IC[4] = Pairing.G1Point(
            uint256(
                18486773086617662673137509426777811771535421650846965902086680648968964429627
            ),
            uint256(
                1707194801858500985434864499144182504321739801017414836630971211548883674841
            )
        );
        vk.IC[5] = Pairing.G1Point(
            uint256(
                20251894556264418887128198022778407515674671366629227429044205235965877105117
            ),
            uint256(
                8367318462055465146991542143379595124424739522981185832980848901286588190666
            )
        );
        vk.IC[6] = Pairing.G1Point(
            uint256(
                1657104625648271517098111559097151041494555386835346658083044589832212223216
            ),
            uint256(
                12876618639800705440489333464519132866550683939554661341750132800642071045003
            )
        );
        vk.IC[7] = Pairing.G1Point(
            uint256(
                9588684827096015772751892545217703079976295225244065439043647771204237171605
            ),
            uint256(
                7816584457720899015473833039753853148554103910554205921068657488836919827094
            )
        );
        vk.IC[8] = Pairing.G1Point(
            uint256(
                19404371944612188984135632810953880969049121527601731317670380635200112172956
            ),
            uint256(
                2568869090854612563715886909862265431315443380865564590038550398150320245210
            )
        );
        vk.IC[9] = Pairing.G1Point(
            uint256(
                18898970748606988211097384347263854615489602951337667199686733976228282911421
            ),
            uint256(
                13708695144829836485393445744180990583944173349503668203524231447327169274168
            )
        );
        vk.IC[10] = Pairing.G1Point(
            uint256(
                11126955015494904610740050137044735717712222247147473040967011451700499662029
            ),
            uint256(
                15169450033829399784368815750432606095771953604819975825490058083220410015266
            )
        );
        vk.IC[11] = Pairing.G1Point(
            uint256(
                5182190897614224121515811850121949803898713541847086064540539034606781587186
            ),
            uint256(
                6992175210072037008140793859699149226545118586304647838491751283572774433647
            )
        );
        vk.IC[12] = Pairing.G1Point(
            uint256(
                12775017934497451360723361502980311080948225736763690373862882271393099996526
            ),
            uint256(
                11703011484642348065117517328676138290217992171849772069659505215735215528076
            )
        );
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
        require(proof.A.X < PRIME_Q, 'verifier-aX-gte-prime-q');
        require(proof.A.Y < PRIME_Q, 'verifier-aY-gte-prime-q');

        require(proof.B.X[0] < PRIME_Q, 'verifier-bX0-gte-prime-q');
        require(proof.B.Y[0] < PRIME_Q, 'verifier-bY0-gte-prime-q');

        require(proof.B.X[1] < PRIME_Q, 'verifier-bX1-gte-prime-q');
        require(proof.B.Y[1] < PRIME_Q, 'verifier-bY1-gte-prime-q');

        require(proof.C.X < PRIME_Q, 'verifier-cX-gte-prime-q');
        require(proof.C.Y < PRIME_Q, 'verifier-cY-gte-prime-q');

        // Make sure that every input is less than the snark scalar field
        //for (uint256 i = 0; i < input.length; i++) {
        for (uint256 i = 0; i < 12; i++) {
            require(
                input[i] < SNARK_SCALAR_FIELD,
                'verifier-gte-snark-scalar-field'
            );
            vk_x = Pairing.plus(
                vk_x,
                Pairing.scalar_mul(vk.IC[i + 1], input[i])
            );
        }

        vk_x = Pairing.plus(vk_x, vk.IC[0]);

        return
            Pairing.pairing(
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
