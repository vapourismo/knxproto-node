/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

"use strict";

const dgram = require("dgram");
const {EventEmitter} = require("events");

const {ensureBuffer} = require("./utilities");
const {HostInfo} = require("./protocol/auxiliary");
const {
	ConnectionRequest,
	ConnectionResponse,
	ConnectionStateRequest,
	ConnectionStateResponse,
	DisconnectRequest
} = require("./protocol/control");


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
	 * @throws {Error} If given buffer is too small, its contents are invalid or the service identifier
	 *                 is unknown
	 * @returns {Object} An instance of the class that represents the payload
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
			case ConnectionResponse.Service:
				return ConnectionResponse.fromBuffer(buffer, 6);

			// Connection state response
			case ConnectionStateResponse.Service:
				return ConnectionStateResponse.fromBuffer(buffer, 6);

			// Disconnect request
			case DisconnectRequest.Service:
				return DisconnectRequest.fromBuffer(buffer, 6);

			default:
				throw new Error("Unknown service identifier '" + service + "'");
		}
	}

	/**
	 * Write KNXnet/IP packet to the given buffer.
	 *
	 * @param {Object}  payload    - Packet payload
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when omitted)
	 * @param {number}  [offset=0] - Output offset
	 * @throws {Error} If payload is too large or the given buffer is too small
	 * @returns {Buffer}
	 */
	static toBuffer(payload, buffer, offset = 0) {
		const entireLength = 6 + payload.bufferSize;

		if (entireLength > 65535)
			throw new Error("Combined packet length exceeds 16-bit unsigned integer upper bound");

		buffer = ensureBuffer(entireLength, buffer, offset);

		buffer[offset] = 6;
		buffer[offset + 1] = 16;

		buffer.writeUInt16BE(payload.service, offset + 2);
		buffer.writeUInt16BE(entireLength, offset + 4);

		payload.toBuffer(buffer, offset + 6);

		return buffer;
	}
}

module.exports = {

};
