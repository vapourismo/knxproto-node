/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

const assert = require("assert");

const {HostInfo} = require("../../lib/protocol/auxiliary");

describe("HostInfo", function () {
	const hi1 = new HostInfo(HostInfo.UDP, "1.2.3.4", 5678);

	describe("static fromBuffer", function () {
		it("accepts result of toBuffer", function () {
			const hi = HostInfo.fromBuffer(hi1.toBuffer());

			assert(hi1.equals(hi));
			assert(hi.equals(hi1));
		});
	});

	describe("constructor", function () {
		it("lets you omit protocol parameter", function () {
			let hi = new HostInfo();
			assert.strictEqual(hi.protocol, HostInfo.UDP);

			hi = new HostInfo(undefined);
			assert.strictEqual(hi.protocol, HostInfo.UDP);
		});

		it("lets you omit address parameter", function () {
			let hi = new HostInfo(undefined);
			assert.strictEqual(hi.address, 0);

			hi = new HostInfo(undefined, undefined);
			assert.strictEqual(hi.address, 0);
		});

		it("lets you omit port parameter", function () {
			let hi = new HostInfo(undefined, "0.0.0.0");
			assert.strictEqual(hi.port, 0);

			hi = new HostInfo(undefined, "0.0.0.0", undefined);
			assert.strictEqual(hi.port, 0);
		});

		it("accepts IPv4 addresses", function () {
			const hi = new HostInfo(undefined, "1.2.3.4");
			assert.strictEqual(hi.address, 0x01020304);
		});

		it("rejects IPv6 addresses", function () {
			assert.throws(function () {
				new HostInfo(undefined, "0123:4567:89AB:CDEF:0123:4567:89AB:CDEF");
			}, Error);
		});
	});

	describe("equals", function () {
		it("has commutative property", function () {
			const hi3 = new HostInfo(1, 0x01020304, 5678);

			assert(hi1.equals(hi3));
			assert(hi3.equals(hi1));
		});
	});
});
