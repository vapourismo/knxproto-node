/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

// const assert = require("better-assert");
const assert = require("assert");

const Proto = require("../lib/index");
const {HostInfo} = Proto;

describe("fromPacket", function () {
	const payload1 = Buffer.from([0x02, 0x04]);
	const header1 = Buffer.from([0x06, 0x10, 0x13, 0x37, 0x00, 0x08]);

	const buffer1 = Buffer.concat([header1, payload1]);
	const info1 = Proto.fromPacket(buffer1);

	it("extracts service identifier", function () {
		assert.strictEqual(info1.service, 0x1337);
	});

	it("slices payload", function () {
		assert(info1.payload.equals(payload1));
	});

	const buffer2 = Buffer.from([0x06, 0x10, 0x13, 0x37, 0x00, 0x06]);
	const info2 = Proto.fromPacket(buffer2);

	it("ignores empty payload", function () {
		assert.strictEqual(info2.payload, null);
	});
});

describe("toPacket", function () {
	const payload1 = Buffer.from([0x02, 0x04]);
	const buffer1 = Proto.toPacket(0x1337, payload1);

	it("generates correct static fields", function () {
		assert(buffer1[0] == 6);
		assert(buffer1[1] == 16);
	});

	it("generates service identifier", function () {
		assert(buffer1.readUInt16BE(2) == 0x1337);
	});

	it("generates packet length", function () {
		assert(buffer1.readUInt16BE(4) == 6 + payload1.length);
	});

	it("appends payload", function () {
		assert(buffer1.slice(6).equals(payload1));
	})
});

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
