/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

"use strict";

const ip = require("ip");

const {HostInfo} = require("./auxiliary");
const {ensureBuffer} = require("../utilities");

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
		buffer = ensureBuffer(this.bufferSize, buffer, offset);

		this.control.toBuffer(buffer, offset);
		this.tunnel.toBuffer(buffer, offset + 8);

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
	get bufferSize() { return 20; }

	/**
	 * Service identifier
	 */
	get service() { return 0x0205; }
}

/**
 * Connection response
 *
 * A connection response is sent by the KNXnet/IP gateway after a connection request has been made.
 *
 * It is structured as follows:
 *
 * |   Octet | Field            | Description           |
 * |--------:|:-----------------|:----------------------|
 * |       0 | Channel          | Communication channel |
 * |       1 | Status           | 0 indicates success   |
 * |   2 - 9 | Host info        |                       |
 * |      10 | Structure length | Always 4              |
 * | 11 - 13 | Unknown          |                       |
 *
 * @see HostInfo
 */
class ConnectionResponse {
	/**
	 *
	 */
	static get Service() { return 0x0206; }

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

	/**
	 * Service identifier
	 */
	get service() { return ConnectionResponse.Service; }
}

/**
 * Connection state request
 *
 * Query the gateway about the connection.
 *
 * It is structued as follows:
 *
 * | Octet | Field     | Description           |
 * |------:|:----------|:----------------------|
 * |     0 | Channel   | Communication channel |
 * |     1 | Status    | 0 = ok                |
 * | 2 - 9 | Host info |                       |
 *
 * @see HostInfo
 */
class ConnectionStateRequest {
	/**
	 * @param {number}   channel    - Communication channel
	 * @param {number}   [status=0] - Status indicator
	 * @param {HostInfo} [hostInfo] - Host information
	 */
	constructor(channel, status = 0, hostInfo = new HostInfo()) {
		this.channel = channel;
		this.status = status;
		this.hostInfo = hostInfo;
	}

	/**
	 * Write {@link ConnectionStateRequest} structure to the given buffer.
	 *
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when omitted)
	 * @param {number}  [offset=0] - Output offset
	 * @throws {Error} If the output buffer is too small
	 * @returns {Buffer}
	 */
	toBuffer(buffer, offset = 0) {
		buffer = ensureBuffer(this.bufferSize, buffer, offset);

		buffer[offset] = this.channel;
		buffer[offset + 1] = this.status;

		this.hostInfo.toBuffer(buffer, offset + 2);

		return buffer;
	}

	/**
	 * Minimum number of bytes required to serialize
	 */
	get bufferSize() { return 10; }

	/**
	 * Service identifier
	 */
	get service() { return 0x0207; }
}

/**
 * Connection state response
 *
 * Sent by the gateway to answer a {@link ConnectionStateRequest}.
 *
 * It is structured as follows:
 *
 * | Octet | Field   | Description           |
 * |------:|:--------|:----------------------|
 * |     0 | Channel | Communication channel |
 * |     1 | Status  | 0 = ok                |
 *
 */
class ConnectionStateResponse {
	/**
	 * Service identifier
	 */
	static get Service() { return 0x0208; }

	/**
	 * Extract {@link ConnectionStateResponse} from the given buffer.
	 *
	 * @param {Buffer} buffer     - Input buffer
	 * @param {number} [offset=0] - Input offset
	 * @throws {Error} If buffer is too small
	 * @returns {ConnectionStateResponse}
	 */
	static fromBuffer(buffer, offset = 0) {
		if ((buffer.length - offset) < 2)
			throw new Error("Given buffer is too small");

		const channel = buffer[offset];
		const status = buffer[offset + 1];

		return new ConnectionStateResponse(channel, status);
	}

	/**
	 * @param {number} channel    - Communication channel
	 * @param {number} [status=0] - Status indicator
	 */
	constructor(channel, status = 0) {
		this.channel = channel;
		this.status = status;
	}

	/**
	 * Service identifier
	 */
	get service() { return ConnectionStateResponse.Service; }
}

/**
 * Disconnect request
 *
 * Sent to or from the gateway, indicating that one of the endpoints wants to terminate the
 * connection.
 *
 * It is structured as follows:
 *
 * | Octet | Field     | Description           |
 * |------:|:----------|:----------------------|
 * |     0 | Channel   | Communication channel |
 * |     1 | Status    | 0 = ok                |
 * | 2 - 9 | Host info |                       |
 *
 */
class DisconnectRequest {
	/**
	 * Service identifier
	 */
	static get Service() { return 0x0209; }

	/**
	 * Extract a {@link DisconnectRequest} from the given buffer.
	 *
	 * @param {Buffer} buffer     - Input buffer
	 * @param {number} [offset=0] - Input offset
	 * @throws {Error} If buffer is too small
	 * @returns {DisconnectRequest}
	 */
	static fromBuffer(buffer, offset = 0) {
		if ((buffer.length - offset) < 10)
			throw new Error("Given buffer is too small");

		const channel = buffer[offset];
		const status = buffer[offset + 1];
		const hostInfo = HostInfo.fromBuffer(buffer, offset + 2);

		return new DisconnectRequest(channel, status, hostInfo);
	}

	/**
	 * @param {number}   channel    - Communication channel
	 * @param {number}   [status=0] - Status indicator
	 * @param {HostInfo} [hostInfo] - Host information
	 */
	constructor(channel, status = 0, hostInfo = new HostInfo()) {
		this.channel = channel;
		this.status = status;
		this.hostInfo = hostInfo;
	}

	/**
	 * Write {@link DisconnectRequest} structure to the given buffer.
	 *
	 * @param {?Buffer} [buffer]   - Output buffer (allocates an appropriate buffer when omitted)
	 * @param {number}  [offset=0] - Output offset
	 * @throws {Error} If the given buffer is too small
	 * @returns {Buffer}
	 */
	toBuffer(buffer, offset = 0) {
		buffer = ensureBuffer(this.bufferSize, buffer, offset);

		buffer[offset] = this.channel;
		buffer[offset + 1] = this.status;

		this.hostInfo.toBuffer(buffer, offset + 2);

		return buffer;
	}

	/**
	 * Minimum number of bytes required to serialize this structure
	 */
	get bufferSize() { return 10; }

	/**
	 * Service identifier
	 */
	get service() { return DisconnectRequest.Service; }
}

module.exports = {
	ConnectionRequest,
	ConnectionResponse,

	ConnectionStateRequest,
	ConnectionStateResponse,

	DisconnectRequest
};
