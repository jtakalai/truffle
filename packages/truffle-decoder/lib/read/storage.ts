import * as utils from "../utils";
import BN from "bn.js";

/**
 * convert a slot to a word corresponding to actual storage address
 *
 * if `slot` is an array, return hash of array values.
 * if `slot` array is nested, recurse on sub-arrays
 *
 * @param slot - number or possibly-nested array of numbers
 */
export function slotAddress(slot: utils.Allocation.Slot): BN {
  // TODO:
  /*if (slot instanceof Array) {
    return utils.EVM.keccak256(...slot.map(slotAddress));
  } else if (typeof slot == "object" && slot.path != undefined) {
    let { path, offset } = slot;
    return utils.Conversion.toBN(slotAddress(path)).addn(offset);
  } else if (typeof slot == "string" && slot.slice(0,2) == "0x") {
    return utils.Conversion.toBN(slot);
  } else {
    return slot;
  }*/

  return new BN(0);
}

/**
 * read slot from storage
 *
 * @param slot - big number or array of regular numbers
 * @param offset - for array, offset from the keccak determined location
 */
export function read(storage: any, slot: utils.Allocation.Slot) {
  const address = slotAddress(slot);

  // debug("reading slot: %o", utils.toHexString(address));

  let word = storage[utils.Conversion.toHexString(address, utils.EVM.WORD_SIZE)] ||
    new Uint8Array(utils.EVM.WORD_SIZE);

  // debug("word %o", word);
  return word;
}

/**
 * read all bytes in some range.
 *
 * parameters `from` and `to` are objects with the following properties:
 *
 *   slot - (required) one of the following:
 *     - a literal value referring to a slot (a number, a bytestring, etc.)
 *
 *     - a "path" array of literal values
 *       path array values get converted into keccak256 hash as per solidity
 *       storage allocation method, after recursing.
 *
 *     - an object { path, offset }, where path is one of the above ^
 *       offset values indicate sequential address offset, post-keccak
 *
 *     ref: https://solidity.readthedocs.io/en/v0.4.23/miscellaneous.html#layout-of-state-variables-in-storage
 *     (search "concatenation")
 *
 *  index - (default: 0) byte index in word
 *
 * @param from - location (see ^)
 * @param to - location (see ^). inclusive.
 * @param length - instead of `to`, number of bytes after `from`
 */
export function readRange(storage: any, range: utils.Allocation.Range) {
  // debug("readRange %o", range);

  let { from, to, length } = range;
  if (!length && !to || length && to) {
    throw new Error("must specify exactly one `to`|`length`");
  }

  from = {
    slot: from.slot,
    index: from.index || 0
  };

  if (length) {
    to = {
      slot: {
        path: from.slot.path,
        offset: from.slot.offset +
          Math.floor((from.index + length - 1) / utils.EVM.WORD_SIZE)
      },
      index: (from.index + length - 1) % utils.EVM.WORD_SIZE
    };
  } else {
    to = {
      slot: to.slot,
      index: to.index
    }
  }

  // debug("normalized readRange %o", {from,to});

  const totalWords = to.slot.offset - from.slot.offset + 1;
  // debug("totalWords %o", totalWords);

  let data = new Uint8Array(totalWords * utils.EVM.WORD_SIZE);

  for (let i = 0; i < totalWords; i++) {
    let offset = i + from.slot.offset;
    data.set(read(storage, { ...from.slot, offset }), i * utils.EVM.WORD_SIZE);
  }
  // debug("words %o", data);

  data = data.slice(from.index, (totalWords - 1) * utils.EVM.WORD_SIZE + to.index + 1);

  // debug("data: %o", data);

  return data;
}
