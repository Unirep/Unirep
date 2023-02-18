// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * From circom using BN128
 * FF exp test values
  R = 28948022309329048855892746252171976963317496166410141009864396001978282409984
  Powers [0-19]
 1
 7059779437489773633646340506914701874769131765994106666166191815402473914367
 12371195157981417840429332247599076334089127903467109501118851908640962647771
 91664821030372581679529607375628823756310439149668501645026407448390597633
 16038164219872748879312642959218862190022861235439020164442255207612871130925
 16782616356586008555702541307566571321530156043407345068293574289799682219660
 19774252239193942055053397695411540560120864151929945406812607060161406974484
 12565986371265850126962811242062249653567082821075564068236826220915416262239
 15609501148448213614522449500500658108549566168199359481845786594163638947641
 20631068592690306338407392191950142757118341468130858982604614960963878215473
 3791600239509551572519234405706855702216993741788790221466416187007632677497
 10815827326662150813626071182635121317639352568885885274309360111072998601528
 15600778020166651892596275860496285275273760257631315438554816757615180856234
 20298753097936865355533241960438718356663309589256341841967409598911021895498
 3724975639185873342521000097021393954118195620533284401633502590886953579843
 13372215639090690721743233990023256146327241960786387108702673553974060503578
 18993237427188252938652200035114407085357284393296647360731174809968242835526
 17903352644817575960330467613456889750459845398329326464233774021612392233415
 3947411764431538711617944989308150320853861220898483040668646843225340304690
 9077311072387902334759390203097943153730624929858882748844779783513425243973
 */

struct PolysumData {
    uint hash;
    uint index;
}

// Calculate a hash of elements using a polynomial equation
library Polysum {
    uint256 internal constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    function add(PolysumData storage self, uint val, uint R)
        public
        returns (uint)
    {
        require(val < SNARK_SCALAR_FIELD, 'vlarge');
        uint index = self.index++;
        uint coef = rForIndex(index, R);
        uint term = mulmod(coef, val, SNARK_SCALAR_FIELD);
        self.hash = addmod(self.hash, term, SNARK_SCALAR_FIELD);
        return index;
    }

    function add(PolysumData storage self, uint[] memory vals, uint R) public {
        require(vals.length < type(uint8).max, 'alarge');
        require(vals.length > 0, 'asmall');
        uint index = self.index;
        uint hash = self.hash;

        uint Rx = rForIndex(index, R);
        for (uint8 x = 0; x < vals.length; x++) {
            uint term = mulmod(Rx, vals[x], SNARK_SCALAR_FIELD);
            hash = addmod(hash, term, SNARK_SCALAR_FIELD);
            index++;
            Rx = mulmod(Rx, R, SNARK_SCALAR_FIELD);
        }
        self.hash = hash;
        self.index = index;
    }

    /**
     * Update an element in the hash for a degree
     **/
    function update(
        PolysumData storage self,
        uint index,
        uint oldval,
        uint newval,
        uint R
    ) public {
        require(oldval < SNARK_SCALAR_FIELD, 'ofield');
        require(newval < SNARK_SCALAR_FIELD, 'nfield');
        require(index < self.index, 'uindex');
        uint coef = rForIndex(index, R);
        uint oldterm = mulmod(coef, oldval, SNARK_SCALAR_FIELD);
        uint newterm = mulmod(coef, newval, SNARK_SCALAR_FIELD);
        uint diff = oldterm > newterm ? oldterm - newterm : newterm - oldterm;
        uint hash = self.hash;
        if (newterm > oldterm) {
            // we are applying an addition
            self.hash = addmod(hash, diff, SNARK_SCALAR_FIELD);
        } else if (diff <= hash) {
            // we can apply a normal subtraction (no mod)
            self.hash -= diff;
        } else {
            // we need to wrap, we're guaranteed that self.hash < diff < SNARK_SCALAR_FIELD
            self.hash = SNARK_SCALAR_FIELD - (diff - hash);
        }
    }

    /**
     * Calculate R ** degree % SNARK_SCALAR_FIELD
     **/
    function rForIndex(uint _index, uint R) public view returns (uint xx) {
        if (_index == 0) return R;
        uint _F = SNARK_SCALAR_FIELD;
        uint index = _index + 1;
        // modular exponentiation
        assembly {
            let freemem := mload(0x40)
            // length_of_BASE: 32 bytes
            mstore(freemem, 0x20)
            // length_of_EXPONENT: 32 bytes
            mstore(add(freemem, 0x20), 0x20)
            // length_of_MODULUS: 32 bytes
            mstore(add(freemem, 0x40), 0x20)
            // BASE
            mstore(add(freemem, 0x60), R)
            // EXPONENT
            mstore(add(freemem, 0x80), index)
            // MODULUS
            mstore(add(freemem, 0xA0), _F)
            let success := staticcall(
                sub(gas(), 2000),
                // call the address 0x00......05
                5,
                // loads the 6 * 32 bytes inputs from <freemem>
                freemem,
                0xC0,
                // stores the 32 bytes return at <freemem>
                freemem,
                0x20
            )
            xx := mload(freemem)
        }
    }
}
