/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

"use strict";

const {ensureBuffer} = require("../utilities");

/**
 * Tunnel request
 *
 * Indicate that a piece of data shall be tunneled or was tunneled.
 *
 * It is structured as follows:
 *
 * | Octet | Field            | Description                       |
 * |------:|:-----------------|:----------------------------------|
 * |     0 | Structure length | Always 4                          |
 * |     1 | Channel          | Communication channel             |
 * |     2 | Sequence number  | Require to acknowledge the packet |
 * |     3 | Reserved         | Always 0                          |
 * | 4 - n | Payload          | Tunneling data (usually CEMI)     |
 *
 */
class TunnelRequest {
	/**
	 * Service identifier
	 */
	static get Service() { return 0x0420; }

	/**
	 * Extract a {@link TunnelRequest} from the given buffer.
	 *
	 * @param {Buffer} buffer     - Input buffer
	 * @param {number} [offset=0] - Input offset
	 * @throws {Error} If buffer is too small, or the buffer contents are invalid
	 * @returns {TunnelRequest}
	 */
	static fromBuffer(buffer, offset = 0) {
		if ((buffer.length - offset) < 4)
			throw new Error("Given buffer is too small");

		if (buffer[offset] != 4)
			throw new Error("Invalid structure length");

		const channel = buffer[offset + 1];
		const seqNumber = buffer[offset + 2];

		return new TunnelRequest(channel, seqNumber, buffer.slice(offset + 4));
	}

	/**
	 * @param {number} channel   - Communication channel
	 * @param {number} seqNumber - Sequence number
	 * @param {Buffer} data      - Payload
	 */
	constructor(channel, seqNumber, data) {
		this.channel = channel;
		this.seqNumber = seqNumber;
		this.data = data;
	}

	/**
	 * Service identifier
	 */
	get service() { return TunnelRequest.Service; }

	/**
	 * Required buffer size to serialize this structure
	 */
	get bufferSize() { return 4 + this.data.length; }

	/**
	 * Write {@link TunnelRequest} structure to the given buffer.
	 *
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when omitted)
	 * @param {number}  [offset=0] - Output offset
	 * @throws {Error} If the given buffer is too small
	 * @returns {Buffer}
	 */
	toBuffer(buffer, offset = 0) {
		buffer = ensureBuffer(this.bufferSize, buffer, offset);

		buffer[offset] = 4;
		buffer[offset + 1] = this.channel;
		buffer[offset + 2] = this.seqNumber;
		buffer[offset + 3] = 0;

		this.data.copy(buffer, offset + 4);

		return buffer;
	}
}

/**
 * Tunnel response
 *
 * An acknowledgement to a tunnel request.
 *
 * It is structured as follows:
 *
 * | Octet | Field            | Description                       |
 * |------:|:-----------------|:----------------------------------|
 * |     0 | Structure length | Always 4                          |
 * |     1 | Channel          | Communication channel             |
 * |     2 | Sequence number  | Which packet to acknowledge       |
 * |     3 | Status           | 0 = ok                            |
 *
 */
class TunnelResponse {
	/**
	 * Service identifier
	 */
	static get Service() { return 0x0421; }

	/**
	 * Extract a {@link TunnelResponse} from the given buffer.
	 *
	 * @param {Buffer} buffer     - Input buffer
	 * @param {number} [offset=0] - Input offset
	 * @throws {Error} If buffer is too small, or the buffer contents are invalid
	 * @returns {TunnelResponse}
	 */
	static fromBuffer(buffer, offset = 0) {
		if ((buffer.length - offset) < 4)
			throw new Error("Given buffer is too small");

		if (buffer[offset] != 4)
			throw new Error("Invalid structure length");

		const channel = buffer[offset + 1];
		const seqNumber = buffer[offset + 2];
		const status = buffer[offset + 3];

		return new TunnelResponse(channel, seqNumber, status);
	}

	/**
	 * @param {number} channel    - Communication channel
	 * @param {number} seqNumber  - Sequence number
	 * @param {number} [status=0] - Status identifier
	 */
	constructor(channel, seqNumber, status = 0) {
		this.channel = channel;
		this.seqNumber = seqNumber;
		this.status = status;
	}

	/**
	 * Service identifier
	 */
	get service() { return TunnelResponse.Service; }

	/**
	 * Number of bytes required to serialize this structure
	 */
	get bufferSize() { return 4; }

	/**
	 * Write {@link TunnelResponse} structure to the given buffer.
	 *
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when omitted)
	 * @param {number}  [offset=0] - Output offset
	 * @throws {Error} If the given buffer is too small
	 * @returns {Buffer}
	 */
	toBuffer(buffer, offset = 0) {
		buffer = ensureBuffer(this.bufferSize, buffer, offset);

		buffer[offset] = 4;
		buffer[offset + 1] = this.channel;
		buffer[offset + 2] = this.seqNumber;
		buffer[offset + 3] = this.status;

		return buffer;
	}
}

module.exports = {
	TunnelRequest,
	TunnelResponse
};
