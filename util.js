const fs = require('fs');
module.exports = {
  writeFile: async function (fileName, data, isBuffer = false){
    const buf = new Uint8Array(Buffer.from(data));
    return await new Promise((reslove, reject) =>{
      fs.writeFile(fileName, isBuffer ? buf : data, error => {
        error ? reject(error): reslove(data);
        // console.log(`${fileName} has saved.`);
      });
    });
  },
  mapLimit,
}

/**
 * 单次控制数量的并发
 *
 * @param {*} arr
 * @param {*} limit
 * @param {*} [interator=async function () { }]
 * @param {*} callback
 * @returns
 */
function mapLimit(arr, limit, interator = async function () { }, callback) {
  let result = [];
  let arrLen;
  let running = 0;
  let done = false;
  let nextElem = createInterator(arr);
  callback = callback || function () { };
  if (typeof arr === 'number') {
    arrLen = arr;
  } else if (Array.isArray(arr)) {
    arrLen = arr.length;
  } else {
    throw 'arr must be a Array';
  }
  const interatee = async function (arg) {
    return await interator.call(null, arg);
  };
  if (limit <= 0 || !arr) {
    return callback(null);
  }
  function replenish() {
    while (running < limit && !done) {
      let item = nextElem();
      if (!item) {
        done = true;
        if (running <= 0) {
          callback(null);
        }
        return;
      }
      running += 1;
      interatee(item.value, item.key)
        .then(res => {
          running--;
          replenish();
          result.push({ value: res, key: item.key });
          if (result.length === arrLen) {
            done = true;
            callback(null, result.sort((a, b) => a.key - b.key).map(item => item.value));
          }
          return res;
        })
        .catch(callback);
    }
  }
  function createInterator(arr) {
    let val = -1;
    let len;
    let isArray;
    if (Array.isArray(arr)) {
      len = arr.length;
      isArray = true;
    } else if (typeof arr === 'number') {
      len = arr;
    }
    return function () {
      let key = ++val;
      return key < len ? { value: isArray ? arr[key] : key, key } : null;
    };
  }
  replenish();
}
