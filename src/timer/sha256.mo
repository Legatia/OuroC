import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Buffer "mo:base/Buffer";

module {
    // SHA256 implementation for Motoko
    // Used for Solana PDA derivation

    private let K: [Nat32] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    private func rotr(n: Nat32, x: Nat32): Nat32 {
        Nat32.bitshiftRight(x, n) | Nat32.bitshiftLeft(x, 32 - n)
    };

    private func ch(x: Nat32, y: Nat32, z: Nat32): Nat32 {
        (x & y) ^ ((^x) & z)
    };

    private func maj(x: Nat32, y: Nat32, z: Nat32): Nat32 {
        (x & y) ^ (x & z) ^ (y & z)
    };

    private func sigma0(x: Nat32): Nat32 {
        rotr(2, x) ^ rotr(13, x) ^ rotr(22, x)
    };

    private func sigma1(x: Nat32): Nat32 {
        rotr(6, x) ^ rotr(11, x) ^ rotr(25, x)
    };

    private func gamma0(x: Nat32): Nat32 {
        rotr(7, x) ^ rotr(18, x) ^ Nat32.bitshiftRight(x, 3)
    };

    private func gamma1(x: Nat32): Nat32 {
        rotr(17, x) ^ rotr(19, x) ^ Nat32.bitshiftRight(x, 10)
    };

    public func hash(data: Blob): Blob {
        let bytes = Blob.toArray(data);
        let msgLen = bytes.size();
        let bitLen = msgLen * 8;

        // Padding
        var paddedLen = msgLen + 1;
        while (paddedLen % 64 != 56) {
            paddedLen += 1;
        };
        paddedLen += 8;

        let padded = Buffer.Buffer<Nat8>(paddedLen);
        for (byte in bytes.vals()) {
            padded.add(byte);
        };
        padded.add(0x80);

        while (padded.size() % 64 != 56) {
            padded.add(0);
        };

        // Add length as 64-bit big-endian
        padded.add(0); padded.add(0); padded.add(0); padded.add(0);
        padded.add(Nat8.fromNat((bitLen / 16777216) % 256));
        padded.add(Nat8.fromNat((bitLen / 65536) % 256));
        padded.add(Nat8.fromNat((bitLen / 256) % 256));
        padded.add(Nat8.fromNat(bitLen % 256));

        // Initialize hash values
        var h0: Nat32 = 0x6a09e667;
        var h1: Nat32 = 0xbb67ae85;
        var h2: Nat32 = 0x3c6ef372;
        var h3: Nat32 = 0xa54ff53a;
        var h4: Nat32 = 0x510e527f;
        var h5: Nat32 = 0x9b05688c;
        var h6: Nat32 = 0x1f83d9ab;
        var h7: Nat32 = 0x5be0cd19;

        let paddedArray = Buffer.toArray(padded);
        var chunkStart = 0;

        while (chunkStart < paddedArray.size()) {
            let w = Buffer.Buffer<Nat32>(64);

            // Prepare message schedule
            var i = 0;
            while (i < 16) {
                let idx = chunkStart + i * 4;
                let val = (Nat32.fromNat(Nat8.toNat(paddedArray[idx])) << 24) |
                         (Nat32.fromNat(Nat8.toNat(paddedArray[idx + 1])) << 16) |
                         (Nat32.fromNat(Nat8.toNat(paddedArray[idx + 2])) << 8) |
                         (Nat32.fromNat(Nat8.toNat(paddedArray[idx + 3])));
                w.add(val);
                i += 1;
            };

            while (i < 64) {
                let s0 = gamma0(w.get(i - 15));
                let s1 = gamma1(w.get(i - 2));
                w.add(w.get(i - 16) +% s0 +% w.get(i - 7) +% s1);
                i += 1;
            };

            var a = h0; var b = h1; var c = h2; var d = h3;
            var e = h4; var f = h5; var g = h6; var h = h7;

            i := 0;
            while (i < 64) {
                let S1 = sigma1(e);
                let ch_val = ch(e, f, g);
                let temp1 = h +% S1 +% ch_val +% K[i] +% w.get(i);
                let S0 = sigma0(a);
                let maj_val = maj(a, b, c);
                let temp2 = S0 +% maj_val;

                h := g; g := f; f := e; e := d +% temp1;
                d := c; c := b; b := a; a := temp1 +% temp2;
                i += 1;
            };

            h0 := h0 +% a; h1 := h1 +% b; h2 := h2 +% c; h3 := h3 +% d;
            h4 := h4 +% e; h5 := h5 +% f; h6 := h6 +% g; h7 := h7 +% h;

            chunkStart += 64;
        };

        // Produce final hash
        let result = Buffer.Buffer<Nat8>(32);
        for (val in [h0, h1, h2, h3, h4, h5, h6, h7].vals()) {
            result.add(Nat8.fromNat(Nat32.toNat(val >> 24)));
            result.add(Nat8.fromNat(Nat32.toNat((val >> 16) & 0xff)));
            result.add(Nat8.fromNat(Nat32.toNat((val >> 8) & 0xff)));
            result.add(Nat8.fromNat(Nat32.toNat(val & 0xff)));
        };

        Blob.fromArray(Buffer.toArray(result))
    };
}
