/* Copyright (C) 2017, Ole Krüger <ole@vprsm.de> */

"use strict";

/**
 * If given a buffer it will check if it is large enough. In case no buffer has been provided, the
 * function will allocate an appropriate one.
 *
 * @param {number}  length     - Number of byte available at given offset
 * @param {?Buffer} [buffer]   - Target buffer
 * @param {number}  [offset=0] - Buffer offset
 * @throws {Error} If the given buffer is too small
 * @returns {Buffer}
 */
function ensureBuffer(length, buffer, offset = 0) {
	if (buffer == null)
		return Buffer.alloc(offset + length);
	else if ((buffer.length - offset) < length)
		throw new Error("Given buffer is too small");
	else
		return buffer;
}

module.exports = {
	ensureBuffer
};
