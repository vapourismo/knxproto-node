/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

"use strict";

/// Extract information from a KNXnet/IP packet.
function fromPacket(buffer) {
	// Check header length
	if (buffer[0] != 6)
		throw new Error("Header length mismatch");

	// Check header version
	if (buffer[1] != 16)
		throw new Error("Header version mismatch");

	// Extract header fields
	const service = buffer.readUInt16BE(2);
	const length = buffer.readUInt16BE(4);

	// Slice contents
	if (length <= 6)
		return {service, payload: null};
	else
		return {service, payload: buffer.slice(6, length)};
}

/// Generate KNXnet/IP packet using the given service identifier and payload.
function toPacket(service, payload) {
	const length = 6 + payload.length;

	// Make sure we can fit the payload size into the header field
	if (length >= 65535)
		throw new Error("Content length exceeds 65535");

	const buffer = Buffer.allocUnsafe(6 + payload.length);

	// Fill header
	buffer[0] = 6;
	buffer[1] = 16;

	buffer.writeUInt16BE(service, 2);
	buffer.writeUInt16BE(length, 4);

	// Append payload
	payload.copy(buffer, 6);

	return buffer;
}

module.exports = {
	fromPacket,
	toPacket
};
