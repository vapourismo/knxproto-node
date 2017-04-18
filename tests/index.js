/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

const assert = require("better-assert");

const Proto = require("../lib/index");

describe("Proto", function () {
	describe("fromPacket", function () {
		const payload1 = Buffer.from([0x02, 0x04]);
		const header1 = Buffer.from([0x06, 0x10, 0x13, 0x37, 0x00, 0x08]);

		const buffer1 = Buffer.concat([header1, payload1]);
		const info1 = Proto.fromPacket(buffer1);

		it("extracts service identifier", function () {
			assert(info1.service === 0x1337);
		});

		it("slices payload", function () {
			assert(info1.payload.equals(payload1));
		});

		const buffer2 = Buffer.from([0x06, 0x10, 0x13, 0x37, 0x00, 0x06]);
		const info2 = Proto.fromPacket(buffer2);

		it("ignores empty payload", function () {
			assert(info2.payload === null);
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
});
