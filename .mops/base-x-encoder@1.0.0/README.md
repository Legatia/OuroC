# Motoko Base-X Encoder

[![MOPS](https://img.shields.io/badge/MOPS-base--x--encoder-blue)](https://mops.one/base-x-encoder)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/yourusername/base-x-encoder/blob/main/LICENSE)

A Motoko library for encoding and decoding data in various base formats including Base64, Base32, Base16 (Hex), and Base58.

## Package

### MOPS

```bash
mops add base-x-encoder
```

To set up MOPS package manager, follow the instructions from the [MOPS Site](https://mops.one)

## Quick Start

### Example 1: Base64 Encoding

```motoko
import BaseX "mo:base-x-encoder";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";

// Example data
let data = [0x48, 0x65, 0x6C, 0x6C, 0x6F].vals(); // "Hello" in ASCII

// Encode to Base64
let encoded = BaseX.toBase64(data, false);
Debug.print(encoded); // Output: "SGVsbG8="

// URI-safe encoding (no padding)
let uriSafe = BaseX.toBase64(data, true);
Debug.print(uriSafe); // Output: "SGVsbG8"
```

### Example 2: Base64 Decoding

```motoko
import BaseX "mo:base-x-encoder";
import Result "mo:new-base/Result";
import Debug "mo:base/Debug";

// Decode Base64 string
let base64 = "SGVsbG8="; // "Hello" in Base64
let result = BaseX.fromBase64(base64);

switch (result) {
  case (#ok(bytes)) {
    // bytes is [0x48, 0x65, 0x6C, 0x6C, 0x6F] (ASCII for "Hello")
    Debug.print("Decoded successfully!");
  };
  case (#err(error)) {
    Debug.print("Error: " # error);
  };
};
```

### Example 3: Hexadecimal Encoding

```motoko
import BaseX "mo:base-x-encoder";
import Debug "mo:base/Debug";

// Example data
let data = [0xA1, 0xB2, 0xC3].vals();

// Format with uppercase hex and 0x prefix
let format1 = {
  isUpper = true;
  prefix = #single("0x")
};
let hex1 = BaseX.toHex(data, format1);
Debug.print(hex1); // Output: "0xA1B2C3"

// Format with lowercase hex and per-byte prefix
let format2 = {
  isUpper = false;
  prefix = #perByte("\\x")
};
let hex2 = BaseX.toHex(data, format2);
Debug.print(hex2); // Output: "\xa1\xb2\xc3"
```

### Example 4: Hexadecimal Decoding

```motoko
import BaseX "mo:base-x-encoder";
import Result "mo:new-base/Result";
import Debug "mo:base/Debug";

// Decode hex with 0x prefix
let hex = "0xA1B2C3";
let format = { prefix = #single("0x") };
let result = BaseX.fromHex(hex, format);

switch (result) {
  case (#ok(bytes)) {
    // bytes is [0xA1, 0xB2, 0xC3]
    Debug.print("Decoded successfully!");
  };
  case (#err(error)) {
    Debug.print("Error: " # error);
  };
};
```

### Example 5: Base58 Encoding and Decoding

```motoko
import BaseX "mo:base-x-encoder";
import Result "mo:new-base/Result";
import Debug "mo:base/Debug";

// Example data
let data = [0x00, 0x01, 0x02].vals();

// Encode to Base58
let encoded = BaseX.toBase58(data);
Debug.print(encoded);

// Decode from Base58
let result = BaseX.fromBase58(encoded);
switch (result) {
  case (#ok(bytes)) {
    // bytes should match the original data
    Debug.print("Decoded successfully!");
  };
  case (#err(error)) {
    Debug.print("Error: " # error);
  };
};
```

## API Reference

### Types

```motoko
public type HexInputFormat = {
    prefix : HexPrefixKind;
};

public type HexOutputFormat = {
    isUpper : Bool;
    prefix : HexPrefixKind;
};

public type HexPrefixKind = {
    #none;
    #single : Text; // '0x' -> 0xABCD
    #perByte : Text; // '\x' -> \xAB\xCD
};

public type Base64OutputFormat = {
    #standard; // RFC 4648 Base64, with padding
    #url; // RFC 4648 URL-safe Base64, no padding
    #urlWithPadding; // RFC 4648 URL-safe Base64, with padding
};

public type Base32OutputFormat = {
    #standard : { isUpper : Bool }; // RFC 4648, A-Z + 2-7, with padding
    #extendedHex : { isUpper : Bool }; // RFC 4648, 0-9 + A-V, with padding
};

public type Base32InputFormat = {
    #standard; // RFC 4648, A-Z + 2-7, with padding
    #extendedHex; // RFC 4648, 0-9 + A-V, with padding
};
```

### Base64 Functions

```motoko
// Convert bytes to Base64 string
public func toBase64(data : Iter.Iter<Nat8>, format : Base64OutputFormat) : Text;

// Decode Base64 string to bytes
public func fromBase64(text : Text) : Result.Result<[Nat8], Text>;
```

### Base32 Functions

```motoko
// Convert bytes to Base32 string
public func toBase32(data : Iter.Iter<Nat8>, format: Base32OutputFormat) : Text;

// Decode Base64 string to bytes
public func fromBase32(text : Text, format: Base32InputFormat) : Result.Result<[Nat8], Text>;
```

### Hexadecimal Functions

```motoko
// Convert bytes to hexadecimal string
public func toHex(data : Iter.Iter<Nat8>, format : HexOutputFormat) : Text;
public func toBase16(data : Iter.Iter<Nat8>, format : HexOutputFormat) : Text; // Alias for toHex

// Decode hexadecimal string to bytes
public func fromHex(hex : Text, format : HexInputFormat) : Result.Result<[Nat8], Text>;
public func fromBase16(base16 : Text, format : HexInputFormat) : Result.Result<[Nat8], Text>; // Alias for fromHex
```

### Base58 Functions

```motoko
// Convert bytes to Base58 string
public func toBase58(bytes : Iter.Iter<Nat8>) : Text;

// Decode Base58 string to bytes
public func fromBase58(text : Text) : Result.Result<[Nat8], Text>;
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
