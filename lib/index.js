/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

"use strict";

const ip = require("ip");

const {HostInfo} = require("./protocol/auxiliary");

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
 * KNXnet/IP packet
 *
 * Represents an entire packet. It is structured as follows:
 *
 * | Octet | Field                   | Description                                               |
 * |------:|:------------------------|:----------------------------------------------------------|
 * |     0 | Header structure length | Always 6                                                  |
 * |     1 | Protocol version        | Always 16                                                 |
 * | 2 - 3 | Service identifier      | Describes which kind of payload you can expect            |
 * | 4 - 5 | Entire packet length    | Length of the entire packet, including header and payload |
 * | 6 - n | Payload                 | Contains the payload that matches the services identifier |
 *
 */
class Packet {
	/**
	 * Extract a KNXnet/IP packet from the given buffer.
	 *
	 * @param {Buffer} buffer     - Input buffer
	 * @param {number} [offset=0] - Input offset
	 * @throws {Error} If given buffer is too small or its contents are invalid
	 * @returns {Packet}
	 */
	static fromBuffer(buffer, offset = 0) {
		if ((buffer.length - offset) < 6)
			throw new Error("Given buffer is too small");

		if (buffer[0] != 6)
			throw new Error("Header length mismatch");

		if (buffer[1] != 16)
			throw new Error("Header version mismatch");

		const service = buffer.readUInt16BE(2);
		switch (service) {
			// Connection response
			case 0x0206:
				return new Packet(ConnectionResponse.fromBuffer(buffer, 6));
		}
	}

	/**
	 * @param {number} service - Service identifier
	 * @param {Object} payload - Packet payload
	 */
	constructor(payload) {
		this.payload = payload;
	}

	/**
	 * Write KNXnet/IP packet including its payload to the given buffer.
	 *
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when omitted)
	 * @param {number}  [offset=0] - Output offset
	 * @throws {Error} If payload is too large or the given buffer is too small
	 * @returns {Buffer}
	 */
	toBuffer(buffer, offset = 0) {
		const entireLength = 6 + this.payload.bufferSize;

		if (entireLength > 65535)
			throw new Error("Combined packet length exceeds 16-bit unsigned integer upper bound");

		if (buffer == null)
			buffer = Buffer.alloc(entireLength + offset);
		else if ((buffer.length - offset) < entireLength)
			throw new Error("Given buffer is too small");

		buffer[offset] = 6;
		buffer[offset + 1] = 16;

		buffer.writeUInt16BE(this.payload.service, offset + 2);
		buffer.writeUInt16BE(entireLength, offset + 4);

		this.payload.toBuffer(buffer, offset + 6);

		return buffer;
	}
}

/**
 * Connection request
 *
 * A connection request is sent to a KNXnet/IP gateway in order to establish a "connection". Both
 * control and tunnel host are endpoints to which the gateway will send information.
 *
 * It is structured as follows:
 *
 * |  Octet | Field             | Description                                         |
 * |-------:|:------------------|:----------------------------------------------------|
 * | 0 -  7 | Control host info | This host will receive control and meta information |
 * | 8 - 15 | Tunnel host info  | This host will receive the actual tunneled data     |
 * |     16 | Structure length  | Always 4                                            |
 * |     17 | Connection type   | Always 4; Means Tunneling Connection                |
 * |     18 | KNX layer         | Always 2; Means Tunneling Layer                     |
 * |     19 | Reserved          | Always 0                                            |
 *
 * @see HostInfo
 */
class ConnectionRequest {
	/**
	 * @param {HostInfo} [control] - Control host information
	 * @param {HostInfo} [tunnel]  - Tunnel host information
	 */
	constructor(control = new HostInfo(), tunnel = new HostInfo()) {
		this.control = control;
		this.tunnel = tunnel;
	}

	/**
	 * Write {@link ConnectionRequest} structure to the given buffer.
	 *
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when omitted)
	 * @param {number}  [offset=0] - Output offset
	 * @throws {Error} If given buffer is too small
	 * @returns {Buffer}
	 */
	toBuffer(buffer, offset = 0) {
		if (buffer == null)
			buffer = Buffer.alloc(20 + offset);
		else if ((buffer.length - offset) < 20)
			throw new Error("Given buffer is too small");

		this.control.toBuffer(buffer, offset);
		this.control.toBuffer(buffer, offset + 8);

		// Connection request information are static, we always tunnel
		buffer[offset + 16] = 4;
		buffer[offset + 17] = 4;
		buffer[offset + 18] = 2;
		buffer[offset + 19] = 0;

		return buffer;
	}

	/**
	 * Minimum number of bytes required to serialize a connection request
	 */
	get bufferSize() {
		return 20;
	}

	/**
	 * Service identifier
	 */
	get service() {
		return 0x0205;
	}
}

/**
 * Connection response
 *
 * It is structured as follows:
 */
class ConnectionResponse {
	/**
	 * Extract a {@link ConnectionResponse} from the given buffer.
	 *
	 * @param {Buffer} buffer     - Input buffer
	 * @param {number} [offset=0] - Input offset
	 * @throws {Error} If buffer content is invalid
	 */
	static fromBuffer(buffer, offset = 0) {
		if ((buffer.length - offset) < 14)
			throw new Error("Given buffer is too small");

		const channel = buffer[offset];
		const status = buffer[offset + 1];
		const hostInfo = HostInfo.fromBuffer(buffer, offset + 2);

		return new ConnectionResponse(channel, status, hostInfo);
	}

	/**
	 * @param {number}   channel  - Channel
	 * @param {number}   status   - Connection status
	 * @param {HostInfo} hostInfo - Host information
	 */
	constructor(channel, status, hostInfo) {
		this.channel = channel;
		this.status = status;
		this.hostInfo = hostInfo;
	}
}

module.exports = {
	fromPacket,
	toPacket,

	Packet,

	ConnectionRequest,
	ConnectionResponse,

	HostInfo
};
