/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

"use strict";

const ip = require("ip");

/**
 * Extract service identifier and payload from KNXnet/IP packet.
 *
 * @param {Buffer} buffer - Input buffer
 * @throws {Error} If buffer contents are invalid
 * @returns {{service: number, payload: ?Buffer}}
 */
function fromPacket(buffer) {
	if (buffer[0] != 6)
		throw new Error("Header length mismatch");

	if (buffer[1] != 16)
		throw new Error("Header version mismatch");

	const service = buffer.readUInt16BE(2);
	const length = buffer.readUInt16BE(4);

	if (length <= 6)
		return {service, payload: null};
	else
		return {service, payload: buffer.slice(6, length)};
}

/**
 * Generate a Buffer that contains a KNXnet/IP packet with the given service identifier and payload.
 *
 * @param {number} service - Service identifier
 * @param {Buffer} payload - Packet payload
 * @throws {Error} If payload length exceeds 16-bit unsigned integer upper bound
 * @returns {Buffer}
 */
function toPacket(service, payload) {
	const length = 6 + payload.length;

	// Make sure we can fit the payload size into the header field
	if (length >= 65535)
		throw new Error("Content length exceeds 65535");

	const buffer = Buffer.allocUnsafe(6 + payload.length);

	buffer[0] = 6;
	buffer[1] = 16;

	buffer.writeUInt16BE(service, 2);
	buffer.writeUInt16BE(length, 4);

	payload.copy(buffer, 6);

	return buffer;
}

/**
 * Host information
 *
 * Represents the `Host Protocol Address Information`, which is structured as follows:
 *
 * | Octet | Field            | Description                    |
 * |------:|:-----------------|:-------------------------------|
 * |     0 | Structure length | Always 8                       |
 * |     1 | Protocol         | 1 is UDP, 2 is TCP             |
 * | 2 - 5 | IPv4 address     | Network-ordered representation |
 * | 6 - 7 | Port number      | Network-ordered representation |
 *
 */
class HostInfo {
	/**
	 * UDP protocol identifier
	 */
	static get UDP() { return 1; }

	/**
	 * TCP protocol identifier
	 */
	static get TCP() { return 2; }

	/**
	 * Extract a {@link HostInfo} instance from the given buffer and offset.
	 *
	 * @param {Buffer} buffer     - Input buffer
	 * @param {number} [offset=0] - Input offset
	 * @throws {Error} If given buffer is too small or buffer contents are invalid
	 * @return {HostInfo}
	 */
	static fromBuffer(buffer, offset = 0) {
		if ((buffer.length - offset) < 8)
			throw new Error("Given buffer is too small");

		if (buffer[offset] != 8)
			throw new Error("Host info structure length is invalid");

		const protocol = buffer[offset + 1];

		if (protocol < 1 || protocol > 2)
			throw new Error("Host info protocol is out of range");

		const address = buffer.readUInt32BE(offset + 2);
		const port = buffer.readUInt16BE(offset + 6);

		return new HostInfo(protocol, address, port);
	}

	/**
	 * @param {number}        [protocol=UDP]    - Protocol identifier
	 * @param {string|number} [address=0.0.0.0] - IPv4 address
	 * @param {number}        [port=0]          - Port number
	 * @throws {Error} If given address is not in IPv4 format
	 */
	constructor(protocol = HostInfo.UDP, address = 0, port = 0) {
		this.protocol = protocol;
		this.port = port;

		switch (typeof(address)) {
			case "string":
				if (ip.isV4Format(address))
					this.address = ip.toLong(address);
				else
					throw new Error("Given address is not a IPv4 address");

				break;

			case "number":
				this.address = address;
				break;

			default:
				this.address = 0;
				break;
		}
	}

	/**
	 * Write {@link HostInfo} structure to the given buffer.
	 *
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when ommited)
	 * @param {number}  [offset=0] - Output offset
	 * @returns {Buffer}
	 */
	toBuffer(buffer, offset = 0) {
		if (buffer == null)
			buffer = Buffer.allocUnsafe(8);

		buffer[offset] = 8;
		buffer[offset + 1] = this.protocol;

		buffer.writeUInt32BE(this.address, offset + 2);
		buffer.writeUInt16BE(this.port, offset + 6);

		return buffer;
	}

	/**
	 * Check if another {@link HostInfo} is equal to this one.
	 *
	 * @param {HostInfo} other
	 * @returns {boolean}
	 */
	equals(other) {
		if (this === other)
			return true;

		if (!(other instanceof HostInfo))
			return false;

		return (
			other.protocol === this.protocol
			&& other.address === this.address
			&& other.port === this.port
		);
	}
}

module.exports = {
	fromPacket,
	toPacket,

	HostInfo
};
